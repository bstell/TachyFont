'use strict';

/**
 * @license
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

goog.provide('tachyfont.DemoBackendService');

goog.require('goog.events');
goog.require('goog.net.EventType');
goog.require('goog.net.XhrIo');
goog.require('tachyfont.BackendService');
goog.require('tachyfont.FontInfo');
goog.require('tachyfont.GlyphBundleResponse');


goog.scope(function() {



/**
 * Handles interacting with the backend server.
 *
 * @param {string} baseUrl URL of the tachyfont server.
 * @constructor
 * @extends {tachyfont.BackendService}
 */
tachyfont.DemoBackendService = function(baseUrl) {
  tachyfont.DemoBackendService.base(this, 'constructor', baseUrl);
};
goog.inherits(tachyfont.DemoBackendService, tachyfont.BackendService);
var DemoBackendService = tachyfont.DemoBackendService;


/** @override */
DemoBackendService.prototype.requestCodepoints = function(fontInfo, codes) {
  var that = this;
  var bandwidth = tachyfont.ForDebug.getCookie('bandwidth', '0');
  return this.requestUrl(
      this.baseUrl + '/incremental_fonts/request',
      'POST',
      JSON.stringify({'font': fontInfo.getName(), 'arr': codes}),
      // Google App Engine servers do not support CORS so we cannot say
      // the 'Content-Type' is 'application/json'.
      //{'Content-Type': 'application/json'},
      {'Content-Type': 'text/plain', 'X-TachyFont-bandwidth': bandwidth})
      .then(function(glyphData) {
        return that.parseCodepointHeader_(glyphData);
      });
};


/**
 * Parses the header of a codepoint response and returns info on it:
 *
 * @param {ArrayBuffer} glyphData modified to point to the start
 *        of the glyph data.
 * @return Header info, {count: ..., flags: ..., version: ...,
 *         fontSignature: ...}
 * @private
 */
DemoBackendService.prototype.parseCodepointHeader_ = function(glyphData) {
  var dataView = new DataView(glyphData);
  var offset = 0;
  var count = dataView.getUint16(offset);
  offset += 2;
  var flags = dataView.getUint8(offset++);
  return new tachyfont.GlyphBundleResponse(
      '1.0', '', count, flags, offset, glyphData);
};


/** @override */
DemoBackendService.prototype.requestFontBase = function(fontInfo) {
  var bandwidth = tachyfont.ForDebug.getCookie('bandwidth', '0');
  return this.requestUrl(this.baseUrl +
      '/incremental_fonts/incrfonts/' + fontInfo.getName() + '/base', 'GET',
      null, { 'X-TachyFont-bandwidth': bandwidth });
};


/** @override */
DemoBackendService.prototype.log = function(message) {
  return this.requestUrl(
      this.baseUrl + '/incremental_fonts/logger',
      'POST',
      message,
      // Google App Engine servers do not support CORS so we cannot say
      // the 'Content-Type' is 'application/json'.
      //{'Content-Type': 'application/json'},
      {'Content-Type': 'text/plain'});
};


});  // goog.scope
