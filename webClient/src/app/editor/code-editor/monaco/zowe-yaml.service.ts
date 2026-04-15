
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import { Injectable, Inject } from '@angular/core';
import { HttpService } from '../../../shared/http/http.service';
import { DataAdapterService } from '../../../shared/http/http.data.adapter.service';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { ProjectContext } from '../../../shared/model/project-context';
import type { SchemasSettings } from 'monaco-yaml';
import { getMonacoYamlInstance } from './monaco-yaml-instance';

// Detects 'zowe:' at the start of a line (top-level key, not indented)
const ZOWE_TOP_KEY_PATTERN = /^zowe\s*:/m;
// Detects directories indented 2 spaces under 'zowe:'
const RUNTIME_DIR_PATTERN = /^  runtimeDirectory\s*:\s*(.+)$/m;
const LOG_DIR_PATTERN = /^  logDirectory\s*:\s*(.+)$/m;
const EXTENSION_DIR_PATTERN = /^  extensionDirectory\s*:\s*(.+)$/m;

// Well-known URIs matching the $id fields in each schema file.
const ZOWE_SCHEMA_BASE_URI = 'https://zowe.org/schemas/v2/server-base';
const ZOWE_SCHEMA_COMMON_URI = 'https://zowe.org/schemas/v2/server-common';

export interface ZoweComponentInfo {
  name: string;
  port?: number;
}

export interface ZoweYamlInfo {
  runtimeDirectory: string;
  logDirectory?: string;
  extensionDirectory?: string;
  externalDomains: string[];
  components: ZoweComponentInfo[];
}

@Injectable()
export class ZoweYamlService {
  private schemaCache: Map<string, object> = new Map();
  private commonSchemaEntry: SchemasSettings | null = null;
  private mainSchemaEntry: SchemasSettings | null = null;

  constructor(
    private http: HttpService,
    private dataAdapter: DataAdapterService,
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger
  ) {}

  /**
   * Returns true when the file content looks like a Zowe YAML configuration.
   * Requires both a top-level 'zowe:' key and a 'runtimeDirectory:' entry inside it.
   */
  isZoweYaml(content: string): boolean {
    return ZOWE_TOP_KEY_PATTERN.test(content) && RUNTIME_DIR_PATTERN.test(content);
  }

  /**
   * Extracts Zowe-specific information from the file content.
   * Returns null if the content does not match the Zowe YAML signature.
   */
  extractZoweYamlInfo(content: string): ZoweYamlInfo | null {
    const runtimeMatch = RUNTIME_DIR_PATTERN.exec(content);
    if (!runtimeMatch) {
      return null;
    }
    // Strip optional surrounding quotes from the value
    const runtimeDirectory = runtimeMatch[1].trim().replace(/^["']|["']$/g, '');
    if (!runtimeDirectory) {
      return null;
    }
    const logMatch = LOG_DIR_PATTERN.exec(content);
    const logDirectory = logMatch ? logMatch[1].trim().replace(/^["']|["']$/g, '') : undefined;
    const extMatch = EXTENSION_DIR_PATTERN.exec(content);
    const extensionDirectory = extMatch ? extMatch[1].trim().replace(/^["']|["']$/g, '') : undefined;
    const externalDomains = this.extractExternalDomains(content);
    const components = this.extractComponents(content);
    return { runtimeDirectory, logDirectory, extensionDirectory, externalDomains, components };
  }

  /**
   * Builds a list of clickable server links from the zowe.yaml context.
   * Uses externalDomains[0] as the hostname and each component's port.
   * Returns an empty array when the context is not a zowe-yaml file or lacks the needed data.
   */
  buildServerLinksForContext(item: ProjectContext): Array<{ name: string; url: string }> {
    if (!item.model || !item.model.contents) {
      return [];
    }
    const info = this.extractZoweYamlInfo(item.model.contents);
    if (!info || !info.externalDomains.length) {
      return [];
    }
    const domain = info.externalDomains[0];
    return info.components
      .filter(c => c.port !== undefined)
      .map(c => ({
        name: `${c.name} (port ${c.port})`,
        url: `https://${domain}:${c.port}/`,
      }));
  }

  /**
   * Loads the Zowe JSON schemas from the runtime directory on z/OS and registers
   * them with monaco-yaml so that the model at monacoModel.uri receives full
   * hover documentation, completions, and schema-based validation.
   */
  activateForModel(monacoModel: any, info: ZoweYamlInfo): void {
    const runtimeDir = info.runtimeDirectory.replace(/\/$/, '');
    const commonSchemaPath = `${runtimeDir}/schemas/server-common.json`;
    const zoweSchemaPath = `${runtimeDir}/schemas/zowe-yaml-schema.json`;

    const toUnixUri = (path: string): string =>
      ZoweZLUX.uriBroker.unixFileUri('contents', path.replace(/^\//, ''), { responseType: 'b64' });

    Promise.all([
      this.fetchSchema(toUnixUri(commonSchemaPath), commonSchemaPath),
      this.fetchSchema(toUnixUri(zoweSchemaPath), zoweSchemaPath),
    ]).then(([commonSchema, zoweSchema]) => {
      const yamlInstance = getMonacoYamlInstance();
      if (!yamlInstance) {
        console.warn('[ZoweYaml] activateForModel: monaco-yaml instance not initialized');
        return;
      }
      if (!zoweSchema) {
        console.warn('[ZoweYaml] activateForModel: Zowe schema unavailable at', zoweSchemaPath);
        return;
      }
      console.log('[ZoweYaml] Registering schemas for model:', monacoModel.uri.toString());

      const modelUri: string = monacoModel.uri.toString();

      // Referenced-only: fileMatch is empty so the schema is never auto-applied
      // to a file, but its URI allows monaco-yaml to resolve cross-schema $refs.
      this.commonSchemaEntry = {
        uri: ZOWE_SCHEMA_COMMON_URI,
        schema: commonSchema as any,
        fileMatch: [],
      };

      // Main schema: grow fileMatch as each Zowe YAML file is opened.
      const existingFileMatch: string[] = this.mainSchemaEntry
        ? this.mainSchemaEntry.fileMatch
        : [];
      this.mainSchemaEntry = {
        uri: ZOWE_SCHEMA_BASE_URI,
        schema: zoweSchema as any,
        fileMatch: existingFileMatch.includes(modelUri)
          ? existingFileMatch
          : [...existingFileMatch, modelUri],
      };

      const schemas: SchemasSettings[] = commonSchema
        ? [this.commonSchemaEntry, this.mainSchemaEntry]
        : [this.mainSchemaEntry];

      yamlInstance.update({ schemas }).then(() => {
        console.log('[ZoweYaml] schemas registered, fileMatch:', this.mainSchemaEntry.fileMatch);
      }).catch((err: any) => {
        console.error('[ZoweYaml] Failed to register schemas with monaco-yaml', err);
      });
    }).catch((err: any) => {
      console.error('[ZoweYaml] Error loading schemas from z/OS', err);
    });
  }

  private extractExternalDomains(content: string): string[] {
    const domains: string[] = [];
    // Matches '  externalDomains:' at 2-space indent (inside the 'zowe:' block)
    const sectionMatch = /^  externalDomains\s*:/m.exec(content);
    if (!sectionMatch) {
      return domains;
    }
    const afterSection = content.substring(sectionMatch.index + sectionMatch[0].length);
    for (const line of afterSection.split('\n')) {
      // List items appear at 4-space indent: '    - value'
      const itemMatch = /^    -\s+(.+)$/.exec(line);
      if (itemMatch) {
        domains.push(itemMatch[1].trim());
      } else if (/^  \S/.test(line) || /^\S/.test(line)) {
        // Reached a sibling or parent key — stop
        break;
      }
    }
    return domains;
  }

  private extractComponents(content: string): ZoweComponentInfo[] {
    const components: ZoweComponentInfo[] = [];
    // 'components:' is a top-level (zero-indent) key
    const sectionMatch = /^components\s*:/m.exec(content);
    if (!sectionMatch) {
      return components;
    }
    const afterSection = content.substring(sectionMatch.index + sectionMatch[0].length);
    let currentComponent: ZoweComponentInfo | null = null;

    for (const line of afterSection.split('\n')) {
      // A non-indented, non-comment line means a new top-level section
      if (/^\S/.test(line) && !/^[\s#]/.test(line)) {
        break;
      }
      // Component name: exactly 2-space indented key, e.g. '  app-server:'
      const componentMatch = /^  ([\w-]+)\s*:/.exec(line);
      if (componentMatch) {
        currentComponent = { name: componentMatch[1] };
        components.push(currentComponent);
        continue;
      }
      if (currentComponent) {
        // Port: exactly 4-space indented 'port: <number>'
        const portMatch = /^    port\s*:\s*(\d+)/.exec(line);
        if (portMatch) {
          currentComponent.port = parseInt(portMatch[1], 10);
        }
      }
    }
    return components;
  }

  private fetchSchema(url: string, cacheKey: string): Promise<any> {
    if (this.schemaCache.has(cacheKey)) {
      return Promise.resolve(this.schemaCache.get(cacheKey));
    }
    return new Promise((resolve) => {
      this.http.get(url, { responseType: 'text' }).subscribe({
        next: (responseText: string) => {
          try {
            const jsonText = this.dataAdapter.convertFileContent(responseText).contents;
            const parsed = JSON.parse(jsonText);
            this.schemaCache.set(cacheKey, parsed);
            resolve(parsed);
          } catch (parseError) {
            this.log.warn(`ZoweYamlService: Failed to parse schema at ${cacheKey}`, parseError);
            resolve(null);
          }
        },
        error: (err: any) => {
          this.log.warn(`ZoweYamlService: Failed to fetch schema at ${cacheKey}`, err);
          resolve(null);
        },
      });
    });
  }
}
