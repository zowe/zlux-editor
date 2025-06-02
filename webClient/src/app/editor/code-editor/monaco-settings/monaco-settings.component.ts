
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, Inject, EventEmitter, Output, ViewChild, ElementRef } from '@angular/core';
import { Angular2InjectionTokens, Angular2PluginViewportEvents } from 'pluginlib/inject-resources';
import { DEFAULT_CONFIG, MonacoConfigItem, ConfigItemType } from '../monaco/monaco.config';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { EditorControlService } from '../../../shared/editor-control/editor-control.service';
import { HttpService } from '../../../shared/http/http.service';
import * as _ from 'lodash';

function getValueNameFromValue(value: string) {
  if (typeof value != 'string') {
    return ''+value;
  }
  let out = value.charAt(0).toUpperCase();
  for (let i = 1; i < value.length; i++) {
    if (value.charCodeAt(i) >= 0x41 && value.charCodeAt(i) <= 0x5a) {
      out+=' '+value.charAt(i);
    } else {
      out+=value.charAt(i);
    }
  }
  return out;
}

function getValueNames(values: string[]) {
  let names = [];
  values.forEach((value:any)=> {
    names.push(getValueNameFromValue(value));
  });
  return names;
}


@Component({
  selector: 'app-monaco-settings',
  templateUrl: './monaco-settings.component.html',
  styleUrls: ['./monaco-settings.component.scss']
})
export class MonacoSettingsComponent implements OnInit {
  
  private resetUI() {
    let items = [];
    DEFAULT_CONFIG.forEach((item)=> {
      let newItem:MonacoConfigItem = Object.assign({},item);
      if (newItem.values) {
        newItem.types = getValueNames(newItem.values);
      }
      newItem.value = newItem.default;
      items.push(newItem);
    });
    this.items = items;
  }

  resetToDefault() {
    this.http.delete<any>(ZoweZLUX.uriBroker.pluginConfigForScopeUri(this.pluginDefinition.getBasePlugin(),'user','monaco','editorconfig.json'))
    .subscribe((response: any) => {
      this.log.info('Restored editor defaults by removing old configuration');
      this.resetUI();
      this.initConfig();
      this.updateEditor();
    });
  }

  private initConfig() {
    this.editorMonacoOptions = {};
    DEFAULT_CONFIG.forEach((item)=> {
      this.setConfig(item.attribute, undefined, item.default);
    });
  }

  public items: MonacoConfigItem[];
  private editor;
  private editorModel;

  /* IMPORTANT There are 4 sets of Monaco Editor options. Search for other occurrences the line you're reading
  1 - saved config data (not in the code)
  2 - master state (obtained from 1) 
  3 - rendered Monaco options for the code viewing Editors
  4 - rendered Monaco options for the Settings Editor 
  
  2 is obtained from 1. Either 3 OR 4 must exist, because sometimes 3 or 4 must be different than 2 (see hasEditorBeenOpened bug)
  3 and 4 must both exist because we can edit our Editor settings without applying on active tabs, we have "Apply Preview" */
  public editorMonacoOptions: any; // This is set 4

  @ViewChild('monacoPreview', { static: true })
  monacoPreviewRef: ElementRef;

  @Output() options = new EventEmitter<any>();
  
  constructor(
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger,
    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) private pluginDefinition: ZLUX.ContainerPluginDefinition,
    @Inject(Angular2InjectionTokens.VIEWPORT_EVENTS) private viewportEvents: Angular2PluginViewportEvents,
    private http: HttpService,
    private editorControl: EditorControlService,
  ) {
    this.resetUI();
  }

  private setConfigFromJson() {
    this.items.forEach((item)=> {
      let parts = item.attribute.split('.');
      let currentObj = this.editorMonacoOptions;
      for (let i = 0; i < parts.length-1; i++) {
        let part = parts[i];
        currentObj = currentObj[part];
        if (!currentObj) {
          break;
        }
      }
      if (currentObj) {
        item.value = currentObj[parts[parts.length-1]];
      }
    });
  }

  private setConfigFromConfigService() {
    this.http.get(ZoweZLUX.uriBroker.pluginConfigForScopeUri(this.pluginDefinition.getBasePlugin(),'user','monaco','editorconfig.json')).subscribe((response: any) => {
      if (response && response.contents && response.contents.config) {
        this.editorMonacoOptions = response.contents.config;
        this.setConfigFromJson();
        this.updateEditor();
      } else {
        this.resetUI();
        this.initConfig();
        this.updateEditor();
      }
    },
    //in case of error, just default                                                                                                                                            
    (e:any)=> {
      this.initConfig();
    });
  }

  
  
  setConfig(attribute: string, value?: any, defaultValue?: any) {
    let val = value !== undefined ? value : defaultValue;
    let parts = attribute.split('.');
    let parentObj = {};
    let mirrored = true;
    let configMirrorObj = this.editorMonacoOptions;
    let lastObj = parentObj;
    let currentObj = parentObj;
    let pos = 0;
    while (pos < parts.length) {
      let newObj = {};
      currentObj[parts[pos]] = newObj;
      lastObj = currentObj;
      currentObj = newObj;
      if (mirrored && pos < parts.length - 1) {
        try {
          configMirrorObj = configMirrorObj[parts[pos]];
        } catch (e) {
          mirrored = false;
        }
      }
      pos++;
    }
    if (configMirrorObj && val === undefined) {
      delete configMirrorObj[parts[parts.length-1]];
    } else if (configMirrorObj) {
      configMirrorObj[parts[parts.length-1]] = val;
    } else {
      lastObj[parts[parts.length-1]] = val;
      this.editorMonacoOptions = Object.assign(this.editorMonacoOptions, parentObj);
    }
  }

  resetEditor() {
    this.setConfigFromConfigService();
  }
  
  update(item: MonacoConfigItem) {
    this.log.debug('monaco config update item=%s, value=%s',item.attribute, item.value);
    this.setConfig(item.attribute, item.value, item.default);
    this.updateEditor();
  }

  private updateEditor() {
    this.log.debug("\nEditor is updated with options\n", this.editorMonacoOptions);
    this.editor.updateOptions(this.editorMonacoOptions);
    this.editor.setValue(this.configToText());
    this.editorControl.setTheme(this.editorMonacoOptions.theme);
  }

  updateFromPreview() {
    let config = this.editorMonacoOptions;
    try {
      this.editorMonacoOptions = JSON.parse(this.editor.getValue());
      this.updateEditor();
      this.setConfigFromJson();
    } catch (e) {
      this.log.warn('Could not use preview JSON for config; Falling back to menu config');
      this.editorMonacoOptions = config;
      //ignore
    }
  }
  
  ngOnInit() {
    // We don't need to use editorControl.sanitizeAndSetOptions(this.editorMonacoOptions) because this is for Monaco Settings editor
    this.editor = monaco.editor.create(this.monacoPreviewRef.nativeElement, this.editorMonacoOptions);
    this.viewportEvents.resized.subscribe(()=> {
      this.editor.layout()
    });
    monaco.editor.remeasureFonts();
    this.setConfigFromConfigService();
    setTimeout(()=> {
      let uri = monaco.Uri.parse('org.zowe.editor://settings/preview');
      this.editorModel = monaco.editor.getModel(uri);
      if (!this.editorModel) {
        this.editorModel = monaco.editor.createModel(this.configToText(), 'json', uri);
      }
      this.editor.setModel(this.editorModel);
      this.updateEditor();
    },500);
    
  }
  
  commitToConfigService() {
    this.updateFromPreview();

    this.http.put(ZoweZLUX.uriBroker.pluginConfigForScopeUri(this.pluginDefinition.getBasePlugin(), 'user', 'monaco', 'editorconfig.json'),
        {
          "_objectType": "org.zowe.editor.monaco.editor.config",
          "_metaDataVersion": "1.0.0",
          "config": this.editorMonacoOptions
        }).subscribe((result: any)=> {
        this.log.debug('Settings store success');
    });
    this.updateMonacoOptions.next(this.editorMonacoOptions);
  }
  
  public isTypeDropdown(type: number) {
    return type == ConfigItemType.array
  }
  public isTypeNumber(type: number) {
    return type == ConfigItemType.number
  }
  public isTypeString(type: number) {
    return type == ConfigItemType.string
  }
  public isTypeToggle(type: number) {
    return type == ConfigItemType.boolean
  }

  public getName(item: MonacoConfigItem) {
    return getValueNameFromValue(item.attribute);
  }

  configToText() {
    return JSON.stringify(this.editorMonacoOptions,null,2);
  }

  textToConfig(text: string) {
    this.editorMonacoOptions = JSON.parse(text);
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
