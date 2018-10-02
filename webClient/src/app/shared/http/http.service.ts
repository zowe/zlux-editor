
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
import { Injectable } from '@angular/core';
import { Http, Headers } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { catchError, retry, map } from 'rxjs/operators';

@Injectable()
export class HttpService {

  HttpOptions = {
    headers: new Headers({
      'Content-Type': 'application/json',
    })
  };

  constructor(private http: Http) { }

  get(url: string, options?: any): Observable<any> {
    return this.http.get(url, this.HttpOptions)
      .pipe(
        retry(3)
    )
      .pipe(map(res => res.json()));
  }

  put<T>(url: string, params: T, options?: any): Observable<any> {
    return this.http.put(url, params, this.HttpOptions)
      .pipe(
        retry(3)
      )
      .pipe(map(res => res.json()));
  }

  post<T>(url: string, params: T, options?: any): Observable<any> {
    return this.http.post(url, params, this.HttpOptions).
      pipe(
        retry(3)
      )
      .pipe(map(res => res.json()));
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
