// Hydrate a synchronous read cache once; persist large projects in IndexedDB.
const ProjectStorage = {
  db: null,
  cache: new Map(),
  pending: Promise.resolve(),
  failures: new Map(),
  owns: (key) => key === "projects" || key.startsWith("proj_"),
  transaction(stores, action) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(stores, "readwrite");
      action(tx);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error || new Error("Storage transaction aborted"));
    });
  },
  async init() {
    try {
      this.db = await new Promise((resolve, reject) => {
        const request = indexedDB.open("functional-websites-projects", 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore("projects");
          request.result.createObjectStore("revisions");
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () =>
          reject(new Error("Close other builder tabs to upgrade storage."));
      });
      const records = await new Promise((resolve, reject) => {
        const out = [];
        const tx = this.db.transaction("projects");
        const request = tx.objectStore("projects").openCursor();
        request.onsuccess = () => {
          const c = request.result;
          if (c) {
            out.push([c.key, c.value]);
            c.continue();
          }
        };
        tx.oncomplete = () => resolve(out);
        tx.onerror = () => reject(tx.error);
      });
      records.forEach(([key, value]) => this.cache.set(key, value));
      const legacyKeys = LS.keys().filter(this.owns);
      await this.transaction(["projects"], (tx) =>
        legacyKeys.forEach((key) => {
          if (key === "projects") {
            const existing = this.cache.get(key) || [];
            const merged = [
              ...existing,
              ...(LS.get(key) || []).filter(
                (p) => !existing.some((saved) => saved.id === p.id),
              ),
            ];
            this.cache.set(key, merged);
            tx.objectStore("projects").put(merged, key);
          } else if (!this.cache.has(key)) {
            const value = LS.get(key);
            this.cache.set(key, value);
            tx.objectStore("projects").put(value, key);
          }
        }),
      );
      // Remove legacy data only after a successful committed migration.
      legacyKeys.forEach((key) => localStorage.removeItem(LS.PREFIX + key));
      const oldGet = LS.get.bind(LS),
        oldSet = LS.set.bind(LS),
        oldDel = LS.del.bind(LS),
        oldKeys = LS.keys.bind(LS);
      LS.get = (key) =>
        this.owns(key)
          ? structuredClone(this.cache.get(key) ?? null)
          : oldGet(key);
      LS.set = (key, value) => {
        if (!this.owns(key)) return oldSet(key, value);
        const copy = structuredClone(value);
        this.cache.set(key, copy);
        this.enqueue(key, () =>
          this.transaction(["projects", "revisions"], (tx) => {
            const projects = tx.objectStore("projects");
            const read = projects.get(key);
            read.onsuccess = () => {
              const previous = read.result;
              projects.put(copy, key);
              // Revision history must reflect committed data, including after a failed save/retry.
              if (
                key.startsWith("proj_") &&
                previous &&
                JSON.stringify(previous) !== JSON.stringify(copy)
              ) {
                const revisions = tx.objectStore("revisions");
                const history = revisions.get(key);
                history.onsuccess = () =>
                  revisions.put(
                    [
                      { savedAt: Date.now(), data: previous },
                      ...(history.result || []),
                    ].slice(0, 5),
                    key,
                  );
              }
            };
          }),
        );
      };
      LS.del = (key) => {
        if (!this.owns(key)) return oldDel(key);
        this.cache.delete(key);
        this.enqueue(key, () =>
          this.transaction(["projects", "revisions"], (tx) => {
            tx.objectStore("projects").delete(key);
            tx.objectStore("revisions").delete(key);
          }),
        );
      };
      LS.keys = () => [...new Set([...oldKeys(), ...this.cache.keys()])];
      this.db.onversionchange = () => {
        this.db.close();
        toast(
          "Storage changed in another tab. Reload the builder before editing.",
          "error",
        );
      };
    } catch (error) {
      this.db = null;
      toast(
        "Large-project storage is unavailable. Using browser local storage; download ZIP backups.",
        "info",
      );
    }
  },
  enqueue(key, action) {
    this.pending = this.pending.then(action).then(
      () => {
        this.failures.delete(key);
      },
      (error) => {
        this.failures.set(key, error);
        setSaveStatus("error");
        toast(
          "Could not save in this browser. Download a ZIP backup before closing.",
          "error",
        );
      },
    );
  },
  async flush() {
    await this.pending;
    if (this.failures.size) throw this.failures.values().next().value;
  },
  async revisions(id) {
    if (!this.db) return [];
    await this.flush();
    return new Promise((resolve, reject) => {
      const request = this.db
        .transaction("revisions")
        .objectStore("revisions")
        .get("proj_" + id);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },
};
async function openProjectRevisions() {
  try {
    const projectId = STATE.currentProjectId,
      revisions = await ProjectStorage.revisions(projectId);
    let el = document.getElementById("project-revisions");
    if (!el) {
      el = document.createElement("div");
      el.id = "project-revisions";
      el.className = "modal-overlay";
      document.body.append(el);
    }
    el.classList.remove("hidden");
    el.innerHTML = `<div class="modal"><div class="modal-title">Saved revisions</div><p>The five previous saved versions are kept in this browser. Restoring is undoable; save to keep the restored version.</p>${revisions.length ? revisions.map((r, i) => `<button class="btn btn-secondary" data-revision="${i}" style="display:block;margin:8px 0">Restore version saved before ${new Date(r.savedAt).toLocaleString()}</button>`).join("") : "<p>No revisions yet. Save a change to create one.</p>"}<div class="modal-actions"><button class="btn btn-secondary" data-close>Close</button></div></div>`;
    el.querySelector("[data-close]").onclick = () => el.classList.add("hidden");
    el.querySelectorAll("[data-revision]").forEach(
      (button) =>
        (button.onclick = () => {
          if (STATE.currentProjectId !== projectId) return;
          pushUndo();
          const currentImages = _projectData.images || [];
          _projectData = normalizeProjectData(
            structuredClone(revisions[Number(button.dataset.revision)].data),
          );
          // Retain current assets so undo can recover content referring to them.
          currentImages.forEach((img) => {
            if (!_projectData.images.some((i) => i.id === img.id))
              _projectData.images.push(img);
          });
          STATE.currentPageIndex = Math.min(
            STATE.currentPageIndex,
            _projectData.pages.length - 1,
          );
          clearBuilderSelection();
          renderPagesList();
          refreshDesignEditor();
          el.classList.add("hidden");
        }),
    );
  } catch (e) {
    toast(e.message, "error");
  }
}
