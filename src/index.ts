/* eslint-env browser */
import debugUtil from "debug";
import es from "event-stream";
import qs from "querystring";
import MultiPartForm from "form-data";
import url from "url";
import validate from "har-validator/lib/async";
import reducer from "./helpers/reducer";
import * as helpers from "./helpers/headers";
import targets from "./targets";
import { formDataIterator, isBlob } from "./helpers/form-data";
import type { Request } from "./types/Request";
import type { PostData } from "./types/PostData";
import type { Entry, Har } from "har-format";

const debug = debugUtil("httpsnippet");

// constructor
class HTTPSnippet {
  private requests: Request[];

  constructor(data: Har) {
    const input = Object.assign({}, data);

    // prep the main container
    this.requests = [];

    // is it har?
    const isHAR = ("log" in input) && ("entries" in input.log);
    const entries = isHAR ? input.log.entries : [{ request: input }]

    for (const entry of entries as Entry[]) {
      // add optional properties to make validation successful
      entry.request.httpVersion = entry.request.httpVersion || "HTTP/1.1"
      entry.request.queryString = entry.request.queryString || [];
      entry.request.headers = entry.request.headers || [];
      entry.request.cookies = entry.request.cookies || [];
      entry.request.postData = entry.request.postData || {} as PostData;
      entry.request.postData!.mimeType = entry.request.postData?.mimeType || "application/octet-stream"

      entry.request.bodySize = 0;
      entry.request.headersSize = 0;
      entry.request.postData as PostData.size = 0;

      validate.request(entry.request, (err, valid) => {
        if (!valid) {
          throw err;
        }

        this.requests.push(this.prepare(entry.request as unknown as Request));
      });
    }
  }

  public prepare(request: Request) {
    // construct utility properties
    request.queryObj = {};
    request.headersObj = {};
    request.cookiesObj = {};
    request.allHeaders = {};
    request.postData.jsonObj = false;
    request.postData.paramsObj = undefined;

    // construct query objects
    if (request.queryString?.length > 0) {
      debug("queryString found, constructing queryString pair map");
      request.queryObj = request.queryString.reduce(reducer, {});
    }

    // construct headers objects
    if (request.headers?.length > 0) {
      const HTTP_2_VERSION_REGEX = /^HTTP\/2/;
      request.headersObj = request.headers.reduce((headers, { name, value }) => {
        let headerName = name;

        if (request.httpVersion.match(HTTP_2_VERSION_REGEX)) {
          headerName = headerName.toLowerCase();
        }

        headers[headerName] = value;
        return headers;
      }, {});
    }

    // construct headers objects
    if (request.cookies?.length > 0) {
      request.cookiesObj = request.cookies.reduceRight((cookies, { name, value }) => {
        cookies[name] = value;
        return cookies;
      }, {});
    }

    // construct Cookie header
    const cookies = request.cookies.map((cookie) => {
      return encodeURIComponent(cookie.name) + "=" + encodeURIComponent(cookie.value);
    });

    if (cookies.length > 0) {
      request.allHeaders.cookie = cookies.join("; ");
    }

    switch (request.postData.mimeType) {
      case "multipart/mixed":
      case "multipart/related":
      case "multipart/form-data":
      case "multipart/alternative":
        // reset values
        request.postData.text = ""
        request.postData.mimeType = "multipart/form-data"

        if (request.postData.params) {
          const form = new MultiPartForm();

          // The `form-data` module returns one of two things: a native FormData object, or its own polyfill. Since the
          // polyfill does not support the full API of the native FormData object, when this library is running in a
          // browser environment it'll fail on two things:
          //
          //  - The API for `form.append()` has three arguments and the third should only be present when the second is a
          //    Blob or USVString.
          //  - `FormData.pipe()` isn't a function.
          //
          // Since the native FormData object is iterable, we easily detect what version of `form-data` we're working
          // with here to allow `multipart/form-data` requests to be compiled under both browser and Node environments.
          //
          // This hack is pretty awful but it's the only way we can use this library in the browser as if we code this
          // against just the native FormData object, we can't polyfill that back into Node because Blob and File objects,
          // which something like `formdata-polyfill` requires, don't exist there.
          const isNativeFormData = typeof form[Symbol.iterator] === 'function'

          // TODO(elianiva): figure out what's this thing is doing
          // easter egg
          const boundary = "---011000010111000001101001"
          if (!isNativeFormData) {
            // @ts-ignore
            form._boundary = boundary;
          }

          request.postData.params.forEach((param) => {
            const name = param.name;
            const value = param.value || ""
            const filename = param.fileName || ""

            if (isNativeFormData) {
              if (isBlob(value)) {
                form.append(name, value, filename);
              } else {
                form.append(name, value);
              }
            } else {
              form.append(name, value, {
                filename: filename,
                contentType: param.contentType || ""
              });
            }
          });

          if (isNativeFormData) {
            // TODO(elianiva): don't ignore this
            // @ts-ignore
            for (const data of formDataIterator(form, boundary)) {
              request.postData.text += data;
            }
          } else {
            // eslint-disable-next-line array-callback-return
            form.pipe(es.map(function(data) {
              request.postData.text += data;
            }));
          }

          request.postData.boundary = boundary;

          // Since headers are case-sensitive we need to see if there's an existing `Content-Type` header that we can
          // override.
          const contentTypeHeader = helpers.hasHeader(request.headersObj, "content-type")
            ? helpers.getHeaderName(request.headersObj, "content-type")
            : "content-type"

          if (contentTypeHeader === undefined) {
            throw Error("How did you get here?");
          }

          request.headersObj[contentTypeHeader] = "multipart/form-data; boundary=" + boundary;
        }
        break;

      case "application/x-www-form-urlencoded":
        if (!request.postData.params) {
          request.postData.text = ""
        } else {
          request.postData.paramsObj = request.postData.params.reduce(reducer, {});

          // always overwrite
          request.postData.text = qs.stringify(request.postData.paramsObj);
        }
        break;

      case "text/json":
      case "text/x-json":
      case "application/json":
      case "application/x-json":
        request.postData.mimeType = "application/json"

        if (request.postData.text) {
          try {
            request.postData.jsonObj = JSON.parse(request.postData.text);
          } catch (e) {
            debug(e);

            // force back to text/plain
            // if headers have proper content-type value, then this should also work
            request.postData.mimeType = "text/plain"
          }
        }
        break;
    }

    // create allHeaders object
    request.allHeaders = Object.assign(request.allHeaders, request.headersObj);

    // deconstruct the uri
    // eslint-disable-next-line node/no-deprecated-api
    request.uriObj = url.parse(request.url, true, true);

    // merge all possible queryString values
    request.queryObj = Object.assign(request.queryObj, request.uriObj.query);

    // reset uriObj values for a clean url
    request.uriObj.query = null;
    request.uriObj.search = null;
    request.uriObj.path = request.uriObj.pathname;

    // keep the base url clean of queryString
    request.url = url.format(request.uriObj);

    // update the uri object
    request.uriObj.query = request.queryObj;
    request.uriObj.search = qs.stringify(request.queryObj);

    if (request.uriObj.search) {
      request.uriObj.path = request.uriObj.pathname + "?" + request.uriObj.search;
    }

    // construct a full url
    request.fullUrl = url.format(request.uriObj);

    return request;
  }
  convert(target, client, opts) {
    if (!opts && client) {
      opts = client;
    }

    const func = this._matchTarget(target, client);
    if (func) {
      const results = this.requests.map(function(request) {
        return func(request, opts);
      });

      return results.length === 1 ? results[0] : results;
    }

    return false;
  }
  _matchTarget(target, client) {
    // does it exist?
    // eslint-disable-next-line no-prototype-builtins
    if (!targets.hasOwnProperty(target)) {
      return false;
    }

    // shorthand
    if (typeof client === "string" && typeof targets[target][client] === "function") {
      return targets[target][client];
    }

    // default target
    return targets[target][targets[target].info.default];
  }
}

// exports
module.exports = HTTPSnippet;

module.exports.addTarget = function(target) {
  if (!("info" in target)) {
    throw new Error("The supplied custom target must contain an `info` object.");
  } else if (!("key" in target.info) || !("title" in target.info) || !("extname" in target.info) || !("default" in target.info)) {
    throw new Error("The supplied custom target must have an `info` object with a `key`, `title`, `extname`, and `default` property.");
    // eslint-disable-next-line no-prototype-builtins
  } else if (targets.hasOwnProperty(target.info.key)) {
    throw new Error("The supplied custom target already exists.");
  } else if (Object.keys(target).length === 1) {
    throw new Error("A custom target must have a client defined on it.");
  }

  targets[target.info.key] = target;
};

module.exports.addTargetClient = function(target, client) {
  // eslint-disable-next-line no-prototype-builtins
  if (!targets.hasOwnProperty(target)) {
    throw new Error(`Sorry, but no ${target} target exists to add clients to.`);
  } else if (!("info" in client)) {
    throw new Error("The supplied custom target client must contain an `info` object.");
  } else if (!("key" in client.info) || !("title" in client.info)) {
    throw new Error("The supplied custom target client must have an `info` object with a `key` and `title` property.");
    // eslint-disable-next-line no-prototype-builtins
  } else if (targets[target].hasOwnProperty(client.info.key)) {
    throw new Error("The supplied custom target client already exists, please use a different key");
  }

  targets[target][client.info.key] = client;
};

module.exports.availableTargets = function() {
  return Object.keys(targets).map(function(key) {
    const target = Object.assign({}, targets[key].info);
    const clients = Object.keys(targets[key])
      .filter(function(prop) {
        return !~["info", "index"].indexOf(prop);
      })
      .map(function(client) {
        return targets[key][client].info;
      });

    if (clients.length) {
      target.clients = clients;
    }

    return target;
  });
};

module.exports.extname = function(target) {
  return targets[target] ? targets[target].info.extname : ""
};
