	/**
	ColorPicker
	========================

	@file      : ColorPicker.js
	@version   : 1.1
	@author    : Ivo Sturm
	@date      : 25-6-2016
	@copyright : First Consulting
	@license   : free

	Documentation
	=============
	
	Mendix widget implementation of the jQuery Bootstrap ColorPicker widget, made available by M. Jolnic, see: http://mjolnic.com/bootstrap-colorpicker/.
	
	Add a color picker to your dataview.
	
	20150706 - 	Fixed issue with Mendix 5.16.0. There was a dependency with jquery. Added the lines 62 - 64
	20160625 -	Upgraded to Mendix 6 standard and new Widget lifecycle. 
			Separated ColorPickerLibrary from main file.
			Deleted jQuery from lib. Now supposed to be already available, for instance via index.html
	
	Open Issues
	===========
	None

*/

dojo.require("ColorPicker.widget.lib.ColorPickerLibrary");

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
	"dojo/text!ColorPicker/widget/ui/ColorPicker.html"
]
, function(declare, NodeList, _WidgetBase,_TemplatedMixin, dom, domStyle, registry,keys, on,ready,domConstruct,dojoLang,parser,dojoArray,widgetTemplate){
    "use strict";
    // Declare widget's prototype.
    return declare("ColorPicker.widget.ColorPicker", [ _WidgetBase, _TemplatedMixin ], {
        
		// _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

		// Parameters configured in the Modeler.
		Entity                	: '',
		colorAttribute		: '',
		horizontal		: false,
		align			: 'right',
		inline			: false,
		format			: 'hex',
		defaultColor		: '',
		enableLogging		: false,
			
		// Global variables
		contextObject		: null,
		mxObject		: null,
		_handles		: null,
		_contextObj		: null,

		/* localized strings */
		 
		postCreate : function () {
				
			this.colorPicker = null; 
			this.colorPickerNode = null;
			
			dojo.addClass(this.domNode, 'ColorPickerWidget');									// add a class to the widget
								
			this.actLoaded();
			
		},
		
		// Here we receive the context and use it to retrieve our object. We also subscribe to any commits of the object elsewhere.
		update : function(obj, callback){
			if (obj) {
		
				this._contextObj = obj;

				this._resetSubscriptions();
				this._buildColorPicker();					

			}
			else {
				console.error("ColorPicker widget: empty context received!")
			}
			typeof(callback) == "function" && callback();
		},
		_buildColorPicker : function() {
			
			var currentColor = this._contextObj.get(this.colorAttribute);
			if (currentColor === '' || currentColor === null || currentColor === 'undefined'){
				currentColor = this.defaultColor;
			}
			var options = {
				horizontal : this.horizontal,
				color : currentColor,
				align : this.align,
				inline : this.inline,
				format : this.format
			};
			
			this.colorPicker = $('.colorPickerInstance').colorpicker(options);
			console.dir(this.colorPicker);
			
			// add event listener to changeColor event
			this.colorPicker.on('changeColor.colorpicker', dojoLang.hitch(this,function (event){
				var newColor = event.color.toHex();

				// set the attribute to the new value
				try{
					this._contextObj.set(this.colorAttribute,newColor);	
				} catch(e){
					console.log('Error in ColorPicker widget with setAttribute for GUID: ' + this._contextObj.getGuid() + ' Message: ' + e.message);
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
								  console.log("Object with guid " + guid + " had its attribute " +
								  attr + " change to " + value);
							}
							this._buildColorPicker();
                    })
                });
			   var entityHandle = mx.data.subscribe({
							   entity: this.Entity,
							   callback: dojoLang.hitch(this, function(entity) {
									if (this.enableLogging){
									  console.log("Update on entity " + entity);
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

require(["ColorPicker/widget/ColorPicker"], function() {
    "use strict";
});		
	
