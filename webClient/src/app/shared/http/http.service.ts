
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
import { catchError, retry, map, tap } from 'rxjs/operators';

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

  delete(url: string, options?: any): Observable<any> {
    return this.http.delete(url, this.HttpOptions).
      pipe(
        retry(3)
      )  /* this last pipe is probably redundant as it's just debugging. 
            It used to handle JSON but the response to http.delete is not JSON. */
      .pipe(
        tap(res => console.log(res)),
        tap(x => console.log('DELETE at line 57 of http.service.ts', x))
        );
  }
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
