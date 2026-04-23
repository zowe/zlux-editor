/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, Inject, ViewEncapsulation } from '@angular/core';
import { Angular2InjectionTokens } from 'pluginlib/inject-resources';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
const ReconnectingWebSocket = require('reconnecting-websocket');

@Component({
  selector: 'app-terminal-panel',
  templateUrl: './terminal-panel.component.html',
  styleUrls: ['./terminal-panel.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TerminalPanelComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('terminalContainer', { static: true }) terminalContainer: ElementRef;

  private terminal: Terminal;
  private fitAddon: FitAddon;
  private ws: any;
  private connected = false;
  private resizeObserver: ResizeObserver;

  public wsUrl: string = '';
  public showConfig: boolean = true;
  public connectionStatus: string = 'disconnected';

  constructor(
    @Inject(Angular2InjectionTokens.LOGGER) private log: ZLUX.ComponentLogger,
    @Inject(Angular2InjectionTokens.PLUGIN_DEFINITION) private pluginDefinition: ZLUX.ContainerPluginDefinition
  ) {}

  ngOnInit() {
    // Inject xterm CSS into the document via link tag if not already present
    if (!document.getElementById('xterm-css')) {
      const link = document.createElement('link');
      link.id = 'xterm-css';
      link.rel = 'stylesheet';
      // __webpack_public_path__ resolves to the plugin's web content root
      link.href = __webpack_public_path__ + 'assets/xterm/xterm.css';
      document.head.appendChild(link);
    }

    this.terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        selectionBackground: '#264f78'
      },
      scrollback: 5000,
      convertEol: true
    });
    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);

    // Try to auto-detect WebSocket URL from Zowe environment
    this.autoDetectUrl();
  }

  ngAfterViewInit() {
    this.terminal.open(this.terminalContainer.nativeElement);
    this.fitAddon.fit();

    this.terminal.writeln('\x1b[1;34m=== Zowe Editor Terminal ===\x1b[0m');
    this.terminal.writeln('Configure a WebSocket terminal URL to connect, or use local mode.');
    this.terminal.writeln('');

    // Handle terminal input
    this.terminal.onData((data: string) => {
      if (this.connected && this.ws) {
        this.ws.send(data);
      }
    });

    // Watch for container resize
    this.resizeObserver = new ResizeObserver(() => {
      this.fit();
    });
    this.resizeObserver.observe(this.terminalContainer.nativeElement);
  }

  ngOnDestroy() {
    this.disconnect();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.terminal) {
      this.terminal.dispose();
    }
  }

  private autoDetectUrl(): void {
    try {
      // Attempt to construct a WebSocket URL from the current page location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      // Default to the Zowe VT terminal service if available
      this.wsUrl = `${protocol}//${host}/ZLUX/plugins/org.zowe.terminal.vt/services/vt/_current/`;
    } catch (e) {
      this.wsUrl = 'ws://localhost:8080/terminal';
    }
  }

  connect(): void {
    if (!this.wsUrl) {
      this.terminal.writeln('\x1b[31mError: No WebSocket URL configured.\x1b[0m');
      return;
    }

    this.connectionStatus = 'connecting';
    this.terminal.writeln(`\x1b[33mConnecting to ${this.wsUrl}...\x1b[0m`);

    const socketOptions = {
      maxReconnectionDelay: 10000,
      minReconnectionDelay: 1000,
      reconnectionDelayGrowFactor: 1.3,
      connectionTimeout: 10000,
      maxRetries: 2,
      debug: false
    };

    try {
      this.ws = new ReconnectingWebSocket(this.wsUrl, undefined, socketOptions);
    } catch (e) {
      this.connectionStatus = 'error';
      this.terminal.writeln(`\x1b[31mFailed to create WebSocket: ${e}\x1b[0m`);
      return;
    }

    this.ws.onopen = () => {
      this.connected = true;
      this.connectionStatus = 'connected';
      this.showConfig = false;
      this.terminal.writeln('\x1b[32mConnected.\x1b[0m');
      this.terminal.writeln('');
      this.terminal.focus();
      this.fit();

      // Send terminal size to server
      const dims = this.fitAddon.proposeDimensions();
      if (dims) {
        try {
          this.ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
        } catch (e) {
          // Server may not support resize messages
        }
      }
    };

    this.ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        this.terminal.write(event.data);
      } else if (event.data instanceof ArrayBuffer) {
        this.terminal.write(new Uint8Array(event.data));
      }
    };

    this.ws.onerror = (e: any) => {
      this.log.warn('Terminal WebSocket error:', e);
      if (!this.connected) {
        this.connectionStatus = 'error';
      }
    };

    this.ws.onclose = (event: any) => {
      const wasConnected = this.connected;
      this.connected = false;
      this.connectionStatus = 'disconnected';
      if (wasConnected) {
        this.terminal.writeln('\x1b[33mDisconnected.\x1b[0m');
      } else {
        this.terminal.writeln(`\x1b[31mConnection failed. Check the URL and ensure the terminal service is running.\x1b[0m`);
        this.showConfig = true;
      }
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.connectionStatus = 'disconnected';
  }

  fit(): void {
    try {
      this.fitAddon.fit();
    } catch (e) {
      // May fail if terminal not visible
    }
  }

  clear(): void {
    this.terminal.clear();
  }

  toggleConfig(): void {
    this.showConfig = !this.showConfig;
  }

  onUrlKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.connect();
    }
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
