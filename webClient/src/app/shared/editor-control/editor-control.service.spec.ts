
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { TestBed, inject } from '@angular/core/testing';

import { EditorControlService } from './editor-control.service';

describe('EditorControlService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EditorControlService]
    });
  });

  it('should be created', inject([EditorControlService], (service: EditorControlService) => {
    expect(service).toBeTruthy();
  }));
});

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
