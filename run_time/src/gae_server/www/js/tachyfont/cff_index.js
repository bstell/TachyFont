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

/**
 * @fileoverview Code to parse the CFF table in an OpenType CFF font. This reads
 * the CFF Header and INDEXs. For a detailed description of the CFF format
 * @see http://wwwimages.adobe.com/content/dam/Adobe/en/devnet/font/pdfs/5176.CFF.pdf
 * For a detailed description of the OpenType font format
 * @see http://www.microsoft.com/typography/otspec/otff.htm
 * @author bstell@google.com (Brian Stell)
 */

goog.provide('tachyfont.CffIndex');

goog.require('goog.log');
goog.require('tachyfont.CffDict');
goog.require('tachyfont.Logger');
goog.require('tachyfont.utils');



/**
 * A class holding CFF INDEX table information.
 * @param {string} name The table name.
 * @param {number} offset The offset from start of the CFF table.
 * @param {number} type Indicates the data type in the index.
 * @param {boolean} isBinary Indicates the data in the index is binary.
 * @param {!tachyfont.BinaryFontEditor} binEd A binary font editor.
 * @constructor @struct @final
 */
tachyfont.CffIndex = function(name, offset, type, isBinary, binEd) {
  /** @private {string} */
  this.name_ = name;

  /** @private {number} */
  this.offset_ = offset;

  /** @private {number} */
  this.type_ = type;

  /** @private {boolean} */
  this.isBinary_ = isBinary;

  /** @dict @private {!Object.<string,string>} */
  this.dictOperators_;

  /** @private {!Array.<string|!DataView|!tachyfont.CffDict>} */
  this.elements_ = [];

  binEd.seek(offset);

  /** @private {number} */
  this.count_ = binEd.getUint16();

  /** @private {number} */
  this.offSize_;

  /** @private {!Array.<number>} */
  this.offsets_ = [];

  // Handle an empty INDEX.
  if (this.count_ == 0) {
    this.tableLength_ = 2;
    this.offSize_ = 0;
    return;
  }

  // Non-empty INDEX so collect the basic info.
  this.offSize_ = binEd.getUint8();
  this.offsets_ = [];

  //debugger;
  for (var i = 0; i <= this.count_; i++) {
    var elementOffset = binEd.getOffset(this.offSize_);
    this.offsets_.push(elementOffset);
  }

  /** @private {number} */
  this.tableLength_ = 2 + 1 + (this.count_ + 1) * this.offSize_ +
      this.offsets_[this.count_] - 1;
};


/**
 * Indicates the CFF INDEX holds strings.
 * @const {number}
 */
tachyfont.CffIndex.TYPE_STRING = 1;


/**
 * Indicates the CFF INDEX holds DICTs.
 * @const {number}
 */
tachyfont.CffIndex.TYPE_DICT = 2;


/**
 * Get an INDEX element.
 * @param {number} index The index of the element.
 * @return {!tachyfont.CffDict|!DataView|string} A element from the INDEX.
 * @throws RangeError if index is not in the array.
 */
tachyfont.CffIndex.prototype.getElement = function(index) {
  if (index in this.elements_) {
    return this.elements_[index];
  }
  throw new RangeError('CFF ' + this.name_ + ' INDEX: invalid index: ' + index);
};


if (goog.DEBUG) {
  /**
   * Set the DICT operators map. The DICT operators map is used to covert the
   * operations to a human readable form.
   * @param {!Object.<string,string>} dictOperators The DICT operators map.
   */
  tachyfont.CffIndex.prototype.setDictOperators = function(dictOperators) {
    this.dictOperators_ = dictOperators;
  };
}


/**
 * Get the table length.
 * @return {number} The length of the table.
 */
tachyfont.CffIndex.prototype.getLength = function() {
  return this.tableLength_;
};


/**
 * Load the INDEX strings.
 * @param {!tachyfont.BinaryFontEditor} binEd A binary font editor.
 */
tachyfont.CffIndex.prototype.loadStrings = function(binEd) {
  goog.log.info(tachyfont.Logger.logger, this.name_);
  var dataStart = this.offset_ + 2 + 1 + (this.count_ + 1) * this.offSize_;
  binEd.seek(dataStart);
  for (var i = 0; i < this.count_; i++) {
    var dataLength = this.offsets_[i + 1] - this.offsets_[i];
    if (this.isBinary_) {
      var dataView = binEd.readDataView(dataLength);
      this.elements_.push(dataView);
    } else {
      var str = binEd.readString(dataLength);
      this.elements_.push(str);
    }
  }
};

/*
 * Routines and data useful when debugging.
 */
if (goog.DEBUG) {
  /**
   * @param {boolean} showData If true then include the data in the display.
   * @param {number} cffTableOffset The offset of the CFF table in the font.
   */
  tachyfont.CffIndex.prototype.display = function(showData, cffTableOffset) {
    goog.log.info(tachyfont.Logger.logger, this.name_ + ':');
    goog.log.info(tachyfont.Logger.logger,
        '  elements: ' + this.elements_.length);
    goog.log.info(tachyfont.Logger.logger, '  offset: ' + this.offset_ + ' / ' +
        tachyfont.utils.numberToHex(this.offset_) + ' (' +
        tachyfont.utils.numberToHex(this.offset_ + cffTableOffset) + ')');

    if (this.count_ != this.elements_.length) {
      goog.log.info(tachyfont.Logger.logger,
          'this.count_(' + this.count_ + ') != ' +
          'this.elements_.length(' + this.elements_.length + ')');
      return;
    }
    for (var i = 0; i < this.count_; i++) {
      var offset = this.offsets_[i];
      var hexOffset = tachyfont.utils.numberToHex(offset);
      var displayStr = '  ' + ('   ' + i.toString()).substr(-3) + ': ' +
          ('  ' + offset).substr(-3) + ' (' + hexOffset + ')';
      if (showData) {
        if (this.type_ == tachyfont.CffIndex.TYPE_DICT) {
          var dict = this.elements_[i];
          var keys = dict.getKeys();
          // display the dict operands/operators.
          for (var j = 0; j < keys.length; j++) {
            var key = keys[j];
            if (dict.dictOperators_) {
              goog.log.info(tachyfont.Logger.logger, dict.get(key) + ' ' +
                  this.dictOperators_[key]);
            } else {
              goog.log.info(tachyfont.Logger.logger, dict.get(key) + ' ' + key);
            }
          }
        } else {
          displayStr += ' ';
          if (this.isBinary_) {
            displayStr += tachyfont.utils.dataViewToHex(
                /** @type {!DataView} */ (this.elements_[i]));
          } else {
            displayStr += '"' + this.elements_[i] + '"';
          }
          goog.log.info(tachyfont.Logger.logger, displayStr);
        }
      }
    }
  };
}


/**
 * Load the INDEX DICTs.
 * @param {!tachyfont.BinaryFontEditor} binEd A binary font editor.
 */
tachyfont.CffIndex.prototype.loadDict = function(binEd) {
  // TODO(bstell): in debug check this is a DICT INDEX.
  goog.log.info(tachyfont.Logger.logger, this.name_);
  var dataStart = this.offset_ + 2 + 1 + (this.count_ + 1) * this.offSize_;
  binEd.seek(dataStart);
  for (var i = 0; i < this.count_; i++) {
    goog.log.info(tachyfont.Logger.logger, 'dict[' + i + ']');
    var length = this.offsets_[i + 1] - this.offsets_[i];
    // TODO(bstell): make this reusable.
    var arrayBuffer = binEd.dataView.buffer;
    var offset = binEd.dataView.byteOffset + binEd.baseOffset + binEd.offset;
    var dataView = new DataView(arrayBuffer, offset, length);
    //tachyfont.utils.hexDump('TopDICT', dataView);
    var dict = new tachyfont.CffDict(this.name_ + i, dataView);
    if (goog.DEBUG) {
      dict.setOperators(this.dictOperators_);
    }
    dict.init();
    this.elements_.push(dict);
  }
};

