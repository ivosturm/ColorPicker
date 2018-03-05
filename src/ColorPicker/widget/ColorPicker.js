	/**
	ColorPicker
	========================

	@file      : ColorPicker.js
	@version   : 1.3
	@author    : Ivo Sturm
	@date      : 14-6-2017
	@copyright : First Consulting
	@license   : Apache V2

	Documentation
	=============
	
	Mendix widget implementation of the jQuery Bootstrap ColorPicker widget, made available by M. Jolnic, see: http://mjolnic.com/bootstrap-colorpicker/.
	
	Add a color picker to your dataview.
	
	20150706 - Fixed issue with Mendix 5.16.0. There was a dependency with jquery. Added the lines 62 - 64
	20160625 - Upgraded to Mendix 6 standard and new Widget lifecycle. 
			   Separated ColorPickerLibrary from main file.
			   Deleted jQuery from lib. Now supposed to be already available, for instance via index.html
	20161010 - Added jQuery and now declared it for local use in this widget only.
	20170614 - v1.3 Upgraded to Mendix 7 AMD style;
					Upgraded jQuery version to 1.11.2; 
					Added on 'hide picker' microflow;
					Added 'Disable' option.
	
*/

define([
    "dojo/_base/declare",
	"dojo/NodeList-traverse",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
	"mxui/dom",
	"dojo/dom-style",
	"dijit/registry",
	"dojo/keys", 
	"dojo/on",
	"dojo/domReady!",
	"dojo/dom-construct",
	"dojo/_base/lang",
	"dojo/parser",
	"dojo/_base/array",
	"dojo/text!ColorPicker/widget/ui/ColorPicker.html",
	"ColorPicker/widget/lib/jquery-1-11-2",
	"ColorPicker/widget/lib/ColorPickerLibrary"
], function(declare, NodeList, _WidgetBase,_TemplatedMixin, dom, domStyle, registry,keys, on,ready,domConstruct,dojoLang,parser,dojoArray,widgetTemplate,_jQuery){
    
	"use strict";
	
	var $ = _jQuery.noConflict(true);
	
    // Declare widget's prototype.
    return declare("ColorPicker.widget.ColorPicker", [ _WidgetBase, _TemplatedMixin ], {
        
		// _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

		// Parameters configured in the Modeler.
		Entity                	: "",
		ColorAttribute			: "",
		horizontal				: false,
		align					: "right",
		inline					: false,
		format					: "hex",
		defaultColor			: "",
		enableLogging			: false,
		_logNode				: "ColorPicker widget: ",
			
		// Global variables
		contextObject	: null,
		mxObject		: null,
		_handles		: null,
		_contextObj		: null,

		/* localized strings */
		 
		postCreate : function () {
				
			this.colorPicker = null; 
			this.colorPickerNode = null;
			if (this.enableLogging){
				if (typeof jquery!=="undefined"){
					console.log(this._logNode + "jQuery version: "+ jquery.fn.jquery + " loaded!");
					if (typeof jquery.fn.colorpicker!=="undefined"){
						console.log(this._logNode + "jQuery extension colorpicker loaded!");
					} else{
						console.error(this._logNode + "jQuery extension colorpicker could not be loaded!");
					}
				} else{
					console.error(this._logNode + "jQuery could not be loaded!");
				}
			}
			
			dojo.addClass(this.domNode, "ColorPickerWidget");									// add a class to the widget
									
		},		
		// Here we receive the context and use it to retrieve our object. We also subscribe to any commits of the object elsewhere.
		update : function(obj, callback){
			if (obj) {
		
				this._contextObj = obj;
				
				this._resetSubscriptions();
				this._buildColorPicker();					

			}
			else {
				console.error("ColorPicker widget: empty context received!");
			}
			if (typeof(callback) == "function") {
				callback();
			}
		},
		_buildColorPicker : function() {
			
			var currentColor = this._contextObj.get(this.ColorAttribute);
			if (currentColor === "" || currentColor === null || currentColor === "undefined"){
				currentColor = this.defaultColor;
			}
			var options = {
				horizontal : this.horizontal,
				color : currentColor,
				align : this.align,
				inline : this.inline,
				format : this.format
			};
			
			this.colorPicker = $(this.domNode).colorpicker(options);
			
			// if disabled from Modeler, disable changing colors
			if (this.disable){
				this.colorPicker.colorpicker('disable');
			}
			
			// add event listener to changeColor event
			this.colorPicker.on('changeColor.colorpicker', dojoLang.hitch(this,function (event){
				var newColor = event.color.toHex();

				// set the attribute to the new value selected from the color picker menu
				try{
					this._contextObj.set(this.ColorAttribute,newColor);

				} catch(e){
					console.log(this._logNode + "Error with setAttribute for GUID: " + this._contextObj.getGuid() + " Message: " + e.message);
				}	
			}));
			
			// add event listener to changeColor event
			this.colorPicker.on('hidePicker.colorpicker', dojoLang.hitch(this,function (event){
				// if on change mf is configured, trigger it with contextobject as input parameter
				if (this.onChangeMF){
					this._execMF(this._contextObj);
				}
			}));

		},
		objChanged : function (objId) {
			mx.data.get({
				guid : objId,
				callback : this.update
			}, this);
		},
		 _resetSubscriptions: function() {
            //logger.debug(this.id + "._resetSubscriptions");
            // Release handles on previous object, if any.
            this._unsubscribe();

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {

                var attrHandle = mx.data.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: dojoLang.hitch(this, function(guid, attr, value) {
                             if (this.enableLogging){
								  console.log(this._logNode + "Object with guid " + guid + " had its attribute " +
								  attr + " change to " + value);
							}
							this._buildColorPicker();
                    })
                });
			   var entityHandle = mx.data.subscribe({
							   entity: this.Entity,
							   callback: dojoLang.hitch(this, function(entity) {
									if (this.enableLogging){
									  console.log(this._logNode + "Update on entity " + entity);
									  console.dir(entity);
									}
									this._buildColorPicker();
								})
				});

                this._handles = [ attrHandle, entityHandle ];
            }
        },
		 _unsubscribe: function () {
          if (this._handles) {
              dojoArray.forEach(this._handles, function (handle) {
                  mx.data.unsubscribe(handle);
              });
              this._handles = [];
          }
        },
		_execMF : function (obj){
			// trigger the On Click Microflow. Use mx.ui.action instead of mx.data.action, since in Mx version mx.data.action has a bug in it, not able to find the mxform if a close page action is used..	
			mx.ui.action(this.onChangeMF,{
						params:	{
							applyto: 'selection',
							guids: [obj.getGuid()]

						},
						progress: "modal",
						origin: this.mxform,
						error: dojoLang.hitch(this,function(error) {
							console.log(error.description);
						}),
						callback: dojoLang.hitch(this,function(result){			
						})						
			},this);
		},
		uninitialize : function() {
			this._unsubscribe();
			var list = dojo.query('.colorpicker');
			for (var i=0;i<list.length;i++){
				try{
					dojo.destroy(list[i]);
				} catch(e){
					console.log(e.message);
				}
			
			}
		}
	});
});

require(["ColorPicker/widget/ColorPicker"]);	
	