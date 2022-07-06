
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { retry, map } from 'rxjs/operators';
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
    return this.http.get(url, options ? options : this.HttpOptions)
      .pipe(
        retry(0)
        )      .pipe(map(res => res));
      }

  put<T>(url: string, params: T, options?: any): Observable<any> {
    return this.http.put(url, params, options ? options : this.HttpOptions)
      .pipe(
        retry(0)
        )      .pipe(map(res => res));
      }

  post<T>(url: string, body, options?: any): Observable<any> {
    return this.http.post(url, body, options ? options : this.HttpOptions).
      pipe(
        retry(0)
      )      .pipe(map(res => res));

  }

  delete<T>(url: string, options?: any): Observable<any> {
    return this.http.delete(url, options ? options : this.HttpOptions).
      pipe(
        retry(0)
        )      .pipe(map(res => res));
      }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
