
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, Inject, EventEmitter } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { DEFAULT_CONFIG, MonacoConfigItem, ConfigItemType } from '../monaco/monaco.config';

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
  styleUrls: ['./monaco-settings.component.scss',  '../../../../styles.scss']
})
export class MonacoSettingsComponent {
  resetToDefault() {
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

  private initConfig() {
    this.config = {};
    DEFAULT_CONFIG.forEach((item)=> {
      this.setConfig(item.attribute, undefined, item.default);
    });
  }

  public config:any;
  public jsonText:string;
  public items: MonacoConfigItem[];
  
  constructor(
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger,
    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) private pluginDefinition: ZLUX.ContainerPluginDefinition,
    private http: HttpClient
  ) {
    this.resetToDefault();
    this.initConfig();
    this.jsonText = this.configToText();
  }

  setConfig(attribute: string, value?: any, defaultValue?: any) {
    let val = value ? value : defaultValue;
    let parts = attribute.split('.');
    let parentObj = {};
    let lastObj = parentObj;
    let currentObj = parentObj;
    let pos = 0;
    while (pos < parts.length) {
      let newObj = {};
      currentObj[parts[pos]] = newObj;
      lastObj = currentObj;
      currentObj = newObj;
      pos++;
    }
    lastObj[parts[parts.length-1]] = val;
    this.config = Object.assign(this.config, parentObj);
    
  }

  update(item: MonacoConfigItem) {
    this.log.info('monaco config update item=%s, value=%s',item.attribute, item.value);
    this.setConfig(item.attribute, item.value, item.default);
    this.jsonText = this.configToText();
  }
  
  ngOnInit() {
  }

  commitToConfigService() {
    this.http.put(ZoweZLUX.uriBroker.pluginConfigForScopeUri(this.pluginDefinition.getBasePlugin(), 'user', 'monaco', 'editorconfig.json'),
        {
          "_objectType": "org.zowe.zlux.editor.monaco.editor.config",
          "_metaDataVersion": "1.0.0",
          "config": this.config
        }).subscribe((result: any)=> {
        this.log.info('Save return');
    });
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
    return JSON.stringify(this.config,null,2);
  }

  textToConfig(text: string) {
    this.config = JSON.parse(text);
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
