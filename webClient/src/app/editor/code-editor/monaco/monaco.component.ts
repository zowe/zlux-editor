
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, Input, OnChanges, SimpleChanges, Inject, ViewChild, ElementRef, OnDestroy } from '@angular/core';

import { MonacoService } from './monaco.service';
import { MonacoConfig } from './monaco.config';
import { EditorControlService } from '../../../shared/editor-control/editor-control.service';
import { LanguageServerService } from '../../../shared/language-server/language-server.service';
import { Angular2InjectionTokens, Angular2PluginViewportEvents } from 'pluginlib/inject-resources';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Subscription } from 'rxjs';
import { EditorKeybindingService } from '../../../shared/editor-keybinding.service';
import { KeyCode } from '../../../shared/keycode-enum';
import { SnackBarService } from '../../../shared/snack-bar.service';
import { MessageDuration } from "../../../shared/message-duration";
import { debounceTime } from 'rxjs/operators';
import { UtilsService } from '../../../shared/utils.service';

@Component({
  selector: 'app-monaco',
  templateUrl: './monaco.component.html',
  styleUrls: ['./monaco.component.scss']
})
export class MonacoComponent implements OnInit, OnChanges, OnDestroy {
  // Usually, we can use 1 public field do our set/get in template, within Angular lifecycle. But we want custom setter. 
  private _monacoOptions: any;
  @Input() get monacoOptions(): any { return this._monacoOptions }
  set monacoOptions(options: any) {
    if (!options) { return; }
    this._monacoOptions = options;
    if (this.editor) {
      if (options.theme) {
        this.editorControl._setDefaultTheme(options.theme);
        this.editorControl.setTheme(options.theme);
      }

      this.editor.updateOptions(options);
    } else {
      this.log.debug("Editor options passed prior to editor init. Cached.");
    }
  };

  @Input() editorFile;
  @Input() compareDataset;
  @ViewChild('monacoEditor', { static: true })
  public monacoEditorRef: ElementRef;
  private editor: any;
  private monacoConfig: MonacoConfig;
  public showEditor: boolean;
  public showDiffViewer: boolean;
  private keyBindingSub: Subscription = new Subscription();
  private diffEditor: monaco.editor.IStandaloneDiffEditor | null ;

  constructor(
    private monacoService: MonacoService,
    private editorControl: EditorControlService,
    private languageService: LanguageServerService,
    private appKeyboard: EditorKeybindingService,
    public snackBar: SnackBarService,
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger,
    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) private pluginDefinition: ZLUX.ContainerPluginDefinition,
    @Inject(Angular2InjectionTokens.VIEWPORT_EVENTS) private viewportEvents: Angular2PluginViewportEvents) {
    this.keyBindingSub.add(this.appKeyboard.keydownEvent.subscribe((event) => {
      if (event.which === KeyCode.KEY_V) {
        this.editorControl.toggleDiffViewer.next('');
      }
    }));

  }

  ngOnInit() {
    this.monacoConfig = new MonacoConfig();
    let options = this._monacoOptions ? Object.assign({}, this._monacoOptions) : {};
    const hasModel = !!options.model;

    if (hasModel) {
      const model = monaco.editor.getModel(options.model.uri || '');
      if (model) {
        options.model = model;
        options.model.setValue('');
      } else {
        options.model = monaco.editor.createModel(options.model.value, options.model.language, options.model.uri);
      }
    }
    this.log.debug("New editor with options=", this.editorControl.sanitizeAndSetOptions(options));
    let editor = monaco.editor.create(this.monacoEditorRef.nativeElement, this.editorControl.sanitizeAndSetOptions(options));
    // let editor = monaco.editor.create(this.monacoEditorRef.nativeElement, (options));
    if (options.theme) {
      this.editorControl._setDefaultTheme(options.theme);
    }
    if (!hasModel) {
      editor.setValue('');
    }
    this.editor = editor;

    this.monacoConfig.onLoad();

    this.onMonacoInit(editor);
    monaco.editor.remeasureFonts();
    this.showEditor = true;

    this.editorControl.toggleDiffViewer.subscribe(() => {
      this.toggleDiffViewer();
    });

    this.editorControl.enableDiffViewer.subscribe(() => {
      this.showEditor = !this.monacoService.spawnDiffViewer();
      this.showDiffViewer = !this.showEditor;
      if (this.showDiffViewer) {
        this.diffEditor = this.monacoService.getDiffEditor();
      }
    });

    this.editor.onContextMenu((e: any) => {
      if (e.target.type === 3) { //if right click is on top of the line numbers
        this.viewportEvents.spawnContextMenu(e.event.browserEvent.clientX, e.event.browserEvent.clientY, [
          {
            text: 'Copy permalink',
            action: () => this.copyPermalink(e)
          },
          {
            text: 'Copy line',
            action: () => this.copyLine(e)
          }
        ], true)
      }
    });
  }

  handleDiffEditorResize() {
    if (this.showDiffViewer && this.diffEditor) {
      this.diffEditor.layout();
    }
  }

  focus(e: any) {
    this.editor.focus();
  }


  ngOnChanges(changes: SimpleChanges) {
    for (const input in changes) {
      if (input === 'editorFile' && changes[input].currentValue != null) {
        this.monacoService.openFile(
          changes[input].currentValue['context'],
          changes[input].currentValue['reload'],
          changes[input].currentValue['line']);
        //TODO: This is a workaround to instruct the editor to remeasure its container when switching from diff-viewer to code-editor
        if (this.showDiffViewer) {
          this.log.debug("ngOnChanges: refreshing layout")
          setTimeout(() => this.editor.layout(), 1);
        }
        this.showEditor = true;
        this.showDiffViewer = false;
        this.diffEditor = null;
      }
    }
  }


  onMonacoInit(editor) {
    this.editorControl.editor.next(editor);
    this.keyBinds(editor);
    this.viewportEvents.resized
      .pipe(debounceTime(100) as any)
      .subscribe(()=> {
        if (!this.showDiffViewer) {
          editor.layout()
        }
        this.handleDiffEditorResize();
    });

    // Connect to configured language servers
    this.editorControl.connToLS.subscribe((lang) => {
      if (lang) {
        this.languageService.connectLanguage(lang);
      } else {
        this.languageService.connectAll();
      }
    });

    this.editorControl.disFromLS.subscribe((lang) => {
      if (lang) {
        this.languageService.disconnectLanguage(lang);
      } else {
        this.languageService.disconnectAll();
      }
    });

    // Auto-connect to language servers if enabled
    if (this.languageService.getEnabled()) {
      this.languageService.connectAll();
    }

    // Forward document content changes to language servers
    editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      if (model) {
        const languageId = model.getLanguageId();
        const uri = model.uri.toString();
        this.languageService.notifyDidChange(uri, languageId, model.getValue());
      }
    });

    // Forward save events to language servers
    this.editorControl.bufferSaved.subscribe(() => {
      const model = editor.getModel();
      if (model) {
        this.languageService.notifyDidSave(model.uri.toString(), model.getLanguageId());
      }
    });
  }

  keyBinds(editor: any) {
    let self = this;
    //editor.addAction({
    // An unique identifier of the contributed action.
    //id: 'save-all',

    // A label of the action that will be presented to the user.
    //label: 'Save All',

    // An optional array of keybindings for the action.
    //keybindings: [
    // tslint:disable-next-line:no-bitwise
    //monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S
    // chord
    // tslint:disable-next-line:no-bitwise
    // monaco.KeyMod.chord(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_M)
    //],

    // A precondition for this action.
    //precondition: null,

    // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
    //keybindingContext: null,

    //contextMenuGroupId: 'file',

    //contextMenuOrder: 1.1,

    // Method that will be executed when the action is triggered.
    // @param editor The editor instance is passed in as a convenience
    //run: function (ed) {
    //self.editorControl.saveAllFile.emit();
    //return null;
    //}
    //});
    editor.addAction({
      // An unique identifier of the contributed action.
      id: 'save',

      // A label of the action that will be presented to the user.
      label: 'Save',

      // An optional array of keybindings for the action.
      keybindings: [
        // tslint:disable-next-line:no-bitwise
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS
        // chord
        // tslint:disable-next-line:no-bitwise
        // monaco.KeyMod.chord(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_M)
      ],

      // A precondition for this action.
      precondition: null,

      // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
      keybindingContext: null,

      contextMenuGroupId: 'file',

      contextMenuOrder: 1.2,

      // Method that will be executed when the action is triggered.
      // @param editor The editor instance is passed in as a convenience
      run: function (ed) {
        self.saveFile();
        return null;
      }
    });
  }

  copyPermalink(event: any) {
    const lines = event.target.position.lineNumber;
    const activeFile = this.editorControl.fetchActiveFile();
    let filePath = '';
    let link = '';
    if (activeFile.model.isDataset) {
      filePath = activeFile.model.path;
      link = `${window.location.origin}${window.location.pathname}?pluginId=${this.pluginDefinition.getBasePlugin().getIdentifier()}:data:${encodeURIComponent(`{"type":"openDataset","name":"${filePath}","lines":"${lines}","toggleTree":true}`)}`;
    } else {
      filePath = activeFile.model.path + "/" + activeFile.model.name;
      link = `${window.location.origin}${window.location.pathname}?pluginId=${this.pluginDefinition.getBasePlugin().getIdentifier()}:data:${encodeURIComponent(`{"type":"openFile","name":"${filePath}","lines":"${lines}","toggleTree":true}`)}`;
    }
    navigator.clipboard.writeText(link).then(() => {
      this.log.debug("Permalink copied to clipboard");
    }).catch((error) => {
      console.error("Failed to copy permalink Error: " + error);
      this.snackBar.open("Failed to copy permalink. Error: " + error, 'Dismiss', { duration: MessageDuration.Short, panelClass: 'center' });
    });
  }

  copyLine(event: any) {
    const lines = event.target.position.lineNumber;
    const lineContent = this.editor.getModel().getLineContent(lines);
    navigator.clipboard.writeText(lineContent).then(() => {
      this.log.debug("Line copied to clipboard");
    }).catch((error) => {
      console.error("Failed to copy line. Error: " + error);
      this.snackBar.open("Failed to copy line. Error: " + error, 'Dismiss', { duration: MessageDuration.Short, panelClass: 'center' });
    });
  }

  saveFile() {
    let fileContext = this.editorControl.fetchActiveFile();
    let directory = fileContext.model.path || this.editorControl.activeDirectory;
    let sub = this.monacoService.saveFile(fileContext, directory).subscribe(() => sub.unsubscribe());
  }

  ngOnDestroy(): void {
    this.keyBindingSub.unsubscribe();
    this.languageService.disconnectAll();
  }

  closeLanguageServer(lang?: string) {
    if (lang) {
      this.languageService.disconnectLanguage(lang);
    } else {
      this.languageService.disconnectAll();
    }
  }

  createUrl(language: string): string {
    return this.languageService.getLanguageUrl(language);
  }

  toggleDiffViewer(): void {
    if (this.showDiffViewer) {
      this.showDiffViewer = false;
      this.showEditor = true;
      this.diffEditor.dispose();
    }
    else {
      this.showEditor = !this.monacoService.spawnDiffViewer();
      this.showDiffViewer = !this.showEditor;
      if (this.showDiffViewer) {
        this.diffEditor = this.monacoService.getDiffEditor();
      }
    }
  }

  acceptChange(): void {
    this.showDiffViewer = false;
    this.showEditor = true;
    this.editorControl.acceptChangeEmitter.emit();
  }

  overwriteDataset(): void {
    this.showDiffViewer = false;
    this.showEditor = true;
    this.editorControl.overwriteDatasetEmitter.emit();
  }


}
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
