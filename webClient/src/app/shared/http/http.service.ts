
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable()
export class HttpService {

  HttpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    })
  };

  constructor(private http: HttpClient) { }

  get(url: string, options?: any): Observable<any> {
    return this.http.get(url, this.HttpOptions)
      .pipe(
        retry(3)
    )
  }

  put<T>(url: string, params: T, options?: any): Observable<any> {
    return this.http.put(url, params, this.HttpOptions)
      .pipe(
        retry(3)
      )
  }

  post<T>(url: string, params: T, options?: any): Observable<any> {
    return this.http.post(url, params, this.HttpOptions).
      pipe(
        retry(3)
      )
  }

  delete<T>(url: string, options?: any): Observable<any> {
    return this.http.delete(url, this.HttpOptions).
      pipe(
        retry(3)
      )
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
