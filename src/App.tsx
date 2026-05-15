import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import {
  OrganizationList,
  OrganizationSwitcher,
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
  useOrganization,
} from '@clerk/clerk-react';
import BpmnCanvas from './components/BpmnCanvas';
import DiagramSidebar from './components/DiagramSidebar';
import CallActivityPicker from './components/CallActivityPicker';
import FileDropZone from './components/FileDropZone';
import StatusBar from './components/StatusBar';
import Toolbar, { type ExportFormat } from './components/Toolbar';
import type { BpmnApi } from './hooks/useBpmnModeler';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { makeEmptyDiagram } from './lib/diagrams/emptyDiagram';
import { exportBpmn } from './lib/exporters/exportBpmn';
import { exportPdf } from './lib/exporters/exportPdf';
import { exportPng } from './lib/exporters/exportPng';
import { exportSvg } from './lib/exporters/exportSvg';
import {
  createDiagram,
  deleteDiagram,
  getDiagram,
  getDiagramByProcessId,
  listCallableProcesses,
  listDiagrams,
  renameDiagram,
  setDiagramCallable,
  updateDiagramXml,
  type DiagramSummary,
} from './lib/diagramRepository';
import { supabaseConfigured, useSupabaseClient } from './lib/supabase';
import {
  getLastDiagramId,
  setLastDiagramId,
} from './hooks/useLocalStoragePersistence';
import { useEditorStore } from './store/editorStore';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function waitForApi(
  ref: MutableRefObject<BpmnApi | null>,
): Promise<BpmnApi> {
  return new Promise((resolve) => {
    const tick = () => {
      if (ref.current) resolve(ref.current);
      else requestAnimationFrame(tick);
    };
    tick();
  });
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
      {children}
    </div>
  );
}

export default function App() {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <OrgGate />
      </SignedIn>
    </>
  );
}

function OrgGate() {
  const { organization, isLoaded } = useOrganization();
  const dark = useEditorStore((s) => s.dark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      window.localStorage.setItem('bmpn:dark', dark ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [dark]);

  if (!isLoaded) return <Centered>Loading…</Centered>;
  if (!organization)
    return (
      <Centered>
        <OrganizationList
          hidePersonal
          afterCreateOrganizationUrl="/"
          afterSelectOrganizationUrl="/"
        />
      </Centered>
    );
  if (!supabaseConfigured)
    return (
      <Centered>
        <div className="max-w-md rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Supabase is not configured. Set <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> (see <code>.env.example</code>),
          then run the SQL in <code>supabase/schema.sql</code>.
        </div>
      </Centered>
    );
  return <Workspace orgId={organization.id} />;
}

function Workspace({ orgId }: { orgId: string }) {
  const db = useSupabaseClient();
  const { userId } = useAuth();
  const apiRef = useRef<BpmnApi | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const diagramId = useEditorStore((s) => s.diagramId);
  const diagramName = useEditorStore((s) => s.diagramName);
  const setDiagram = useEditorStore((s) => s.setDiagram);
  const setDiagramName = useEditorStore((s) => s.setDiagramName);
  const setSaving = useEditorStore((s) => s.setSaving);
  const markSaved = useEditorStore((s) => s.markSaved);

  const [diagrams, setDiagrams] = useState<DiagramSummary[]>([]);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [callables, setCallables] = useState<DiagramSummary[]>([]);

  const currentRow = diagrams.find((d) => d.id === diagramId) ?? null;
  const isCurrentCallable = currentRow?.is_callable ?? false;

  const notify = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      4000,
    );
  }, []);

  const refresh = useCallback(async () => {
    if (!db) return [] as DiagramSummary[];
    try {
      const list = await listDiagrams(db);
      setDiagrams(list);
      return list;
    } catch (e) {
      notify(errMsg(e));
      return [];
    }
  }, [db, notify]);

  const open = useCallback(
    async (id: string) => {
      if (!db) return;
      try {
        const row = await getDiagram(db, id);
        setDiagram(row.id, row.name);
        const api = await waitForApi(apiRef);
        await api.importXml(row.bpmn_xml);
        setLastDiagramId(orgId, row.id);
      } catch (e) {
        notify(errMsg(e));
      }
    },
    [db, orgId, setDiagram, notify],
  );

  const createNew = useCallback(async () => {
    if (!db || !userId) return;
    try {
      const row = await createDiagram(db, {
        orgId,
        ownerId: userId,
        name: 'Untitled',
        bpmnXml: makeEmptyDiagram(),
      });
      await refresh();
      await open(row.id);
    } catch (e) {
      notify(errMsg(e));
    }
  }, [db, userId, orgId, refresh, open, notify]);

  const save = useCallback(async () => {
    const api = apiRef.current;
    if (!db || !api) return;
    try {
      setSaving(true);
      const xml = await api.getXml();
      let id = useEditorStore.getState().diagramId;
      if (!id) {
        if (!userId) return;
        const row = await createDiagram(db, {
          orgId,
          ownerId: userId,
          name: useEditorStore.getState().diagramName,
          bpmnXml: xml,
        });
        id = row.id;
        setDiagram(row.id, row.name);
        await refresh();
      } else {
        await updateDiagramXml(db, id, xml);
      }
      markSaved();
      setLastDiagramId(orgId, id);
    } catch (e) {
      setSaving(false);
      notify(errMsg(e));
    }
  }, [db, userId, orgId, setSaving, setDiagram, markSaved, refresh, notify]);

  const importFile = useCallback(
    async (xml: string, name: string) => {
      if (!db || !userId) return;
      try {
        const row = await createDiagram(db, {
          orgId,
          ownerId: userId,
          name,
          bpmnXml: xml,
        });
        await refresh();
        await open(row.id);
      } catch (e) {
        notify(errMsg(e));
      }
    },
    [db, userId, orgId, refresh, open, notify],
  );

  const onImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFilePicked = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const text = await file.text();
      void importFile(text, file.name.replace(/\.(bpmn|xml)$/i, ''));
    },
    [importFile],
  );

  const removeDiagram = useCallback(
    async (id: string) => {
      if (!db) return;
      if (!window.confirm('Delete this diagram?')) return;
      try {
        await deleteDiagram(db, id);
        const list = await refresh();
        if (useEditorStore.getState().diagramId === id) {
          setDiagram(null, 'Untitled');
          setLastDiagramId(orgId, null);
          if (list[0]) void open(list[0].id);
          else void createNew();
        }
      } catch (e) {
        notify(errMsg(e));
      }
    },
    [db, orgId, refresh, open, createNew, setDiagram, notify],
  );

  const commitRename = useCallback(
    async (name: string) => {
      const id = useEditorStore.getState().diagramId;
      if (!db || !id || !name.trim()) return;
      try {
        await renameDiagram(db, id, name.trim());
        await refresh();
      } catch (e) {
        notify(errMsg(e));
      }
    },
    [db, refresh, notify],
  );

  const doExport = useCallback(
    async (format: ExportFormat) => {
      const api = apiRef.current;
      if (!api) return;
      try {
        if (format === 'bpmn') {
          exportBpmn(await api.getXml());
          return;
        }
        const svg = await api.getSvg();
        if (format === 'svg') exportSvg(svg);
        else if (format === 'png') await exportPng(svg);
        else if (format === 'pdf') {
          try {
            await exportPdf(svg);
          } catch {
            notify('PDF via SVG failed — exporting high-res PNG instead');
            await exportPng(svg, 'diagram.png', 3);
          }
        }
      } catch (e) {
        notify(errMsg(e));
      }
    },
    [notify],
  );

  useKeyboardShortcuts({ onSave: save, onOpen: onImportClick });

  const openByProcessId = useCallback(
    async (processId: string) => {
      if (!db) return;
      try {
        const target = await getDiagramByProcessId(db, processId);
        if (!target) {
          notify('Referenced sub-process not found in this organization.');
          return;
        }
        await open(target.id);
      } catch (e) {
        notify(errMsg(e));
      }
    },
    [db, open, notify],
  );

  useEffect(() => {
    let active = true;
    void waitForApi(apiRef).then((api) => {
      if (active) api.setCallActivityOpenHandler((pid) => void openByProcessId(pid));
    });
    return () => {
      active = false;
    };
  }, [openByProcessId]);

  const openCallActivityPicker = useCallback(async () => {
    if (!db) return;
    try {
      setCallables(await listCallableProcesses(db));
      setPickerOpen(true);
    } catch (e) {
      notify(errMsg(e));
    }
  }, [db, notify]);

  const pickCallable = useCallback(
    (processId: string, name: string) => {
      setPickerOpen(false);
      apiRef.current?.insertCallActivity({ calledElement: processId, name });
    },
    [],
  );

  const createReusable = useCallback(async () => {
    if (!db || !userId) return;
    try {
      const row = await createDiagram(db, {
        orgId,
        ownerId: userId,
        name: 'Reusable sub-process',
        bpmnXml: makeEmptyDiagram(),
        isCallable: true,
      });
      await refresh();
      setPickerOpen(false);
      if (row.process_id) {
        apiRef.current?.insertCallActivity({
          calledElement: row.process_id,
          name: row.name,
        });
      }
    } catch (e) {
      notify(errMsg(e));
    }
  }, [db, userId, orgId, refresh, notify]);

  const toggleCurrentCallable = useCallback(async () => {
    const id = useEditorStore.getState().diagramId;
    if (!db || !id) {
      notify('Save the diagram first, then mark it reusable.');
      return;
    }
    try {
      const current =
        diagrams.find((d) => d.id === id)?.is_callable ?? false;
      await setDiagramCallable(db, id, !current);
      await refresh();
    } catch (e) {
      notify(errMsg(e));
    }
  }, [db, diagrams, refresh, notify]);

  // Initial load: reopen last diagram, else first, else create one.
  const bootedRef = useRef(false);
  useEffect(() => {
    if (!db || bootedRef.current) return;
    bootedRef.current = true;
    void (async () => {
      const list = await refresh();
      const last = getLastDiagramId(orgId);
      if (last && list.some((d) => d.id === last)) void open(last);
      else if (list[0]) void open(list[0].id);
      else void createNew();
    })();
  }, [db, orgId, refresh, open, createNew]);

  return (
    <div className="flex h-screen flex-col bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
        <span className="font-semibold">BPMN</span>
        <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/" />
        <input
          className="ml-2 w-56 rounded border border-transparent bg-transparent px-2 py-1 text-sm hover:border-slate-300 focus:border-blue-400 focus:outline-none dark:hover:border-slate-600"
          value={diagramName}
          onChange={(e) => setDiagramName(e.target.value)}
          onBlur={(e) => void commitRename(e.target.value)}
          aria-label="Diagram name"
        />
        <div className="ml-auto">
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <Toolbar
        apiRef={apiRef}
        onNew={createNew}
        onSave={save}
        onImportClick={onImportClick}
        onExport={doExport}
        onAddCallActivity={() => void openCallActivityPicker()}
        onToggleCallable={() => void toggleCurrentCallable()}
        isCallable={isCurrentCallable}
      />

      <div className="flex min-h-0 flex-1">
        <DiagramSidebar
          diagrams={diagrams}
          currentId={diagramId}
          onOpen={open}
          onNew={createNew}
          onDelete={removeDiagram}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <BpmnCanvas apiRef={apiRef} />
          <StatusBar />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".bpmn,.xml,application/xml,text/xml"
        className="hidden"
        onChange={onFilePicked}
      />
      <FileDropZone onFile={importFile} />

      <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="rounded bg-slate-800 px-4 py-2 text-sm text-white shadow-lg dark:bg-slate-700"
          >
            {t.msg}
          </div>
        ))}
      </div>

      <CallActivityPicker
        open={pickerOpen}
        callables={callables}
        onPick={pickCallable}
        onCreateNew={() => void createReusable()}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
