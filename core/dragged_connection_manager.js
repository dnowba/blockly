/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2017 Google Inc.
 * https://developers.google.com/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Class that controls updates to connections during drags.
 * @author fenichel@google.com (Rachel Fenichel)
 */
'use strict';

goog.provide('Blockly.DraggedConnectionManager');

goog.require('Blockly.RenderedConnection');

goog.require('goog.math.Coordinate');


/**
 * Class that controls updates to connections during drags.  It is primarily
 * responsible for finding the closest eligible connection and highlighting or
 * unhiglighting it as needed during a drag.
 * @param {!Blockly.BlockSvg} block The top block in the stack being dragged.
 * @constructor
 */
Blockly.DraggedConnectionManager = function(block) {
  /**
   * The top block in the stack being dragged.
   * Does not change during a drag.
   * @type {!Blockly.Block}
   * @private
   */
  this.topBlock_ = block;

  /**
   * The workspace on which these connections are being dragged.
   * Does not change during a drag.
   * @type {!Blockly.WorkspaceSvg}
   * @private
   */
  this.workspace_ = block.workspace;

  /**
   * The connections on the dragging blocks that are available to connect to
   * other blocks.  This includes all open connections on the top block, as well
   * as the last connection on the block stack.
   * Does not change during a drag.
   * @type {!Array.<!Blockly.RenderedConnection>}
   * @private
   */
  this.availableConnections_ = this.initAvailableConnections_();

  /**
   * The connection that this block would connect to if released immediately.
   * Updated on every mouse move.
   * @type {Blockly.RenderedConnection}
   * @private
   */
  this.closestConnection_ = null;

  /**
   * The connection that would connect to this.closestConnection_ if this block
   * were released immediately.
   * Updated on every mouse move.
   * @type {Blockly.RenderedConnection}
   * @private
   */
  this.localConnection_ = null;

  /**
   * The distance between this.closestConnection_ and this.localConnection_.
   * Updated on every mouse move.
   * @type {number}
   * @private
   */
  this.radiusConnection_ = 0;

  Blockly.selected = block;
};

/**
 * Update highlighted connections and the cursor based on the most recent move
 * event.
 * @param {!Event} e Mouse move event to respond to.
 * @param {!goog.math.Coordinate} dxy Position relative to drag start.
 */
Blockly.DraggedConnectionManager.prototype.update = function(e, dxy) {
  var oldClosestConnection = this.closestConnection_;
  var closestConnectionChanged = this.updateClosest_(dxy);

  if (closestConnectionChanged && oldClosestConnection) {
    oldClosestConnection.unhighlight();
  }

  var wouldDeleteBlock = this.updateCursor_(e);

  if (!wouldDeleteBlock && closestConnectionChanged &&
      this.closestConnection_) {
    this.addConnectionHighlighting();
  }
};

/**
 * Remove highlighting from the currently highlighted connection, if it exists.
 */
Blockly.DraggedConnectionManager.prototype.removeConnectionHighlighting = function() {
  if (this.closestConnection_) {
    this.closestConnection_.unhighlight();
  }
};

/**
 * Add highlighting to the closest connection, if it exists.
 */
Blockly.DraggedConnectionManager.prototype.addConnectionHighlighting = function() {
  if (this.closestConnection_) {
    this.closestConnection_.highlight();
  }
};

/**
 * Populate the list of available connections on this block stack.  This should
 * only be called once, at the beginning of a drag.
 * @return {!Array.<!Blockly.RenderedConnection>} a list of available
 *     connections.
 * @private
 */
Blockly.DraggedConnectionManager.prototype.initAvailableConnections_ = function() {
  var available = this.topBlock_.getConnections_(false);
  // Also check the last connection on this stack
  var lastOnStack = this.topBlock_.lastConnectionInStack_();
  if (lastOnStack && lastOnStack != this.topBlock_.nextConnection) {
    available.push(lastOnStack);
  }
  return available;
};

/**
 * Find the new closest connection, and update internal state in response.
 * @param {!goog.math.Coordinate} dxy Position relative to the drag start.
 * @return {boolean} Whether the closest connection has changed.
 * @private
 */
Blockly.DraggedConnectionManager.prototype.updateClosest_ = function(dxy) {
  var oldClosestConnection = this.closestConnection_;

  this.closestConnection_ = null;
  this.localConnection_ = null;
  this.radiusConnection_ = Blockly.SNAP_RADIUS;
  for (var i = 0; i < this.availableConnections_.length; i++) {
    var myConnection = this.availableConnections_[i];
    var neighbour = myConnection.closest(this.radiusConnection_, dxy);
    if (neighbour.connection) {
      this.closestConnection_ = neighbour.connection;
      this.localConnection_ = myConnection;
      this.radiusConnection_ = neighbour.radius;
    }
  }
  return oldClosestConnection != this.closestConnection_;
};

/**
 * Provide visual indication of whether the block will be deleted if
 * dropped here.
 * Prefer connecting over dropping into the trash can, but prefer dragging to
 * the toolbox over connecting to other blocks.
 * @param {!Event} e Mouse move event.
 * @return {boolean} True if the block would be deleted if dropped here,
 *     otherwise false.
 * @private
 */
Blockly.DraggedConnectionManager.prototype.updateCursor_ = function(e) {
  var deleteArea = this.workspace_.isDeleteArea(e);
  var wouldConnect = this.closestConnection_ &&
      deleteArea != Blockly.DELETE_AREA_TOOLBOX;
  var wouldDelete = deleteArea && !this.topBlock_.getParent() &&
      this.topBlock_.isDeletable();
  var showDeleteCursor = wouldDelete && !wouldConnect;

  if (showDeleteCursor) {
    Blockly.Css.setCursor(Blockly.Css.Cursor.DELETE);
    if (deleteArea == Blockly.DELETE_AREA_TRASH && this.workspace_.trashcan) {
      this.workspace_.trashcan.setOpen_(true);
    }
    return true;
  } else {
    Blockly.Css.setCursor(Blockly.Css.Cursor.CLOSED);
    if (this.workspace_.trashcan) {
      this.workspace_.trashcan.setOpen_(false);
    }
    return false;
  }
};
