// Base model

var PropertyTypeUsage = Base.extend({
  constructor: function(pName, pAlias, isOwned, propType) {
    this.alias = pAlias;
    this.name  = pName; // local type name, when owned
    this.owned = isOwned;
    this.type  = propType;
  },
          
  create: function() {
     return this.type.getPropertyObject({
       name: this.alias
     });
  }
}, { // static
  create: function(propSpec, Model) {
    var pName, pAlias, isOwned = false;
    switch(typeof propSpec) {
      case 'string':
        pName = pAlias = propSpec;
        break;

      case 'object':
        // better be non-null...
        pAlias = propSpec.alias;
        pName  = propSpec.name;
             if(!pAlias && pName ) { pAlias = pName ; }
        else if(!pName  && pAlias) { pName  = pAlias; }
        isOwned = propSpec.owned === true;
        break;
    }

    if(!pAlias) { return null; }
    
    var pFullName = isOwned ? (Model.MODEL + "_" + pName) : pName;
    var propType = PropertiesManager.getPropertyType(pFullName);
    
    if(!propType) { return null; }
    
    return new PropertyTypeUsage(pName, pAlias, isOwned, propType);
  }
});

var BaseModel = (function() {
  
  var LegacyModel = {
    getPropertyUsage: function(name) {
      return PropertyTypeUsage.create(name, this); // may be null
    },
    
    createProperty: function(name) {
      var propUsage = this.getPropertyUsage(name);
      return propUsage && propUsage.create();
    }
  };
  
  var CommonModel = {
    _addPropertyUsage: function(propUsage) {
      this._properties.push(propUsage);
      this._propertiesByAlias[propUsage.alias] = propUsage;
      this._propertiesByName [propUsage.name ] = propUsage;
      return propUsage;
    },
    _addPropSpec: function(propSpec) {
      var propUsage = PropertyTypeUsage.create(propSpec, this);
      return propUsage && this._addPropertyUsage(propUsage);
    },
    _getPropertyUsages: function() {
      if(this._propertySpecs) {
        this._propertiesByAlias = {};
        this._propertiesByName  = {};
        this._properties = [];
        
        this._propertySpecs.forEach(this._addPropSpec, this);
        
        delete this._propertySpecs;
      }

      return this._properties;
    },

    getPropertyUsage: function(name) {
      // Lazy init
      if(this._propertySpecs) { this._getPropertyUsages(); }
      
      return this._propertiesByAlias[name] || 
             this._propertiesByName[name]  ||
             // Some component properties are extension properties --
             // are not defined in the component type, maybe because they are deprecated --
             // try to find a global definition for them, anyway.
             // If found, the property is dynamically registered in 
             // the component type's properties.
             this._addPropSpec(name);
    },
    
    createProperty: LegacyModel.createProperty
  }; // End CommonModel
  
  // BaseModel
  return Base.extend({}, {
    MODEL:  'BaseModel',
    getStub: function() { return {}; },
    models:  {},

    registerModel: function(_class) {
      this.models[_class.MODEL] = _class;
      
      if(!_class.getPropertyUsage) {
        $.extend(_class, LegacyModel);
      }
      
      return _class;
    },

    getModel: function(modelId) {
      return this.models[modelId];
    },
      
    /**
     * Creates a BaseModel sub-class with appropriate static properties and methods.
     */
    create: function(spec) {
      var modelName   = spec.name;
      var modelDesc   = spec.description;
      var modelParent = spec.parent;
      var modelMetas  = spec.metas;
      
      var CustomModel = this.extend({}, {
        MODEL: modelName,
        _propertySpecs: spec.properties || [], // Lazily compiled by _getPropertyUsages
        
        getStub: function() {
          return $.extend({
            id:         TableManager.generateGUID(),
            type:       modelName,
            typeDesc:   modelDesc,
            parent:     modelParent != null ? modelParent : IndexManager.ROOTID,
            properties: this._getPropertyUsages().map(function(pu) { return pu.create(); })
          }, modelMetas);
        }
      }); // CustomModel
      
      $.extend(CustomModel, CommonModel);
      
      return this.registerModel(CustomModel);
    }
  }); // End BaseModel
}());


var CellOperations = Base.extend({

    logger: {},

    constructor: function(){
      this.logger = new Logger("BaseType");
    }
},{

    operations: [],


    // After defining an operation. we need to register it
    registerOperation: function(operation){
      this.operations.push(operation);
    },

    getOperationsByType: function(type){
    
      var _operations = [];

      $.each(CellOperations.operations,function(i,value){
      
          for(var i in value.types){
            if(value.types.hasOwnProperty(i)){
              if(type.match("^"+value.types[i])){
                _operations.push(value);
              }
            }
          }
        });
      return _operations;
    }

});

var BaseOperation = Base.extend({

    id: "BASE_OPERATION",
    types: ["TYPE"],
    name: "Base operation",
    description: "Base Operation description",
    icon: "getResource?resource=/images/toolbar-folder-add-48x48.png",
    order: 20,
    logger: {},
    hoverIcon: null, //icon to display on hover
    clickIcon: null, //icon while clicking
    showInactiveIcon: false, //show icon when !canExecute

    execute: function(tableManager){
      this.logger.error("Method not implemented; " + tableManager.getTableId() + "; " + tableManager.getSelectedCell());
    },

    canExecute: function(tableModel){
    
      return true;
    },

    constructor: function(){
      this.logger = new Logger("BaseOperation");
    },

    getHtml: function(tableManager,idx){

      var tableManagerId = tableManager.getTableId();
      var code ='';

      if (this.canExecute(tableManager)){
        code = '<a class="tooltip '+this.getId().toLowerCase()+' tableOperation" title="' + this.getName() + '"  href="javascript:TableManager.executeOperation(\'' + tableManagerId + '\','+ idx+');">\n</a>';
      }

      return code;
    
    },

    getId: function(){return this.id},
    setId: function(id){this.id = id},
    getName: function(){return this.name},
    setName: function(name){this.name = name},
    getDescription: function(){return this.description},
    setDescription: function(description){this.description = description},
    getIcon: function(){return this.icon},
    setIcon: function(icon){this.icon = icon}

});


var AddRowOperation = BaseOperation.extend({

    id: "ADD_ROW",
    types: ["GenericRow"],
    name: "New Row",
    description: "Adds a new row to the layout on the specific position",
    icon: "getResource?resource=/images/NAV/addrow.png",

    constructor: function(){
      this.logger = new Logger("AddRowOperation");
    }

});

CellOperations.registerOperation(new AddRowOperation());

var MoveUpOperation = BaseOperation.extend({

    id: "MOVE_UP",
    types: ["GenericMoveUp"],
    name: "Move Up",
    description: "Move up",
    icon: "getResource?resource=/images/NAV/up.png",
    hoverIcon: "getResource?resource=/images/NAV/up_mouseover.png",
    clickIcon: "getResource?resource=/images/NAV/up_onclick.png",

    constructor: function(){
      this.logger = new Logger("MoveUpOperation");
    },

    canExecute: function(tableManager){
    
      var rowIdx = tableManager.getSelectedCell()[0];
      var rowId = tableManager.getTableModel().getEvaluatedId(rowIdx);

      return !tableManager.getTableModel().getIndexManager().isFirstChild(rowId);

    },

    execute: function(tableManager){

      // Move up: move the selected node and all children
      // up to the previous item

      var rowIdx = tableManager.getSelectedCell()[0];
      var colIdx = tableManager.getSelectedCell()[1];
      var rowId = tableManager.getTableModel().getEvaluatedId(rowIdx);

      var fromIdx = rowIdx;
      var toIdx = -1;

      var nextSibling = tableManager.getTableModel().getIndexManager().getNextSibling(rowId);
      if (typeof nextSibling == 'undefined'){
        toIdx = tableManager.getTableModel().getIndexManager().getLastChild(rowId).index;
      }
      else{
        toIdx = nextSibling.index - 1;
      }
      var targetIdx = tableManager.getTableModel().getIndexManager().getPreviousSibling(rowId).index;

      this.logger.debug("Moving nodes from " + fromIdx + " to " + toIdx + " to the place of " + targetIdx);

      // Build a new data array
      var _data = tableManager.getTableModel().getData();
      var _tmp = _data.splice(fromIdx, toIdx-fromIdx + 1);

      _data.splice(targetIdx,0)
      Array().splice.apply(_data,[targetIdx,0].concat(_tmp));
      //_data = _data.slice(0,targetIdx).concat(_tmp).concat(_data.slice(targetIdx));
      tableManager.getTableModel().setData(_data);

      // Now do the same on the UI

      // move rows id: fromIdx -> toIdx to targetIdx
      for(var i = 0; i<= toIdx-fromIdx; i++){
        $('#'+tableManager.getTableId() + " > tbody > tr:eq("+ (targetIdx + i) +")").before(
          $('#'+tableManager.getTableId() + " > tbody > tr:eq("+ (fromIdx + i) +")")
        );
      }

      tableManager.setSelectedCell([targetIdx,colIdx]);
      tableManager.updateOperations();
      
      
      /*
      tableManager.cleanSelections();
      tableManager.init();
      tableManager.selectCell(targetIdx,colIdx);
      */

      var a = [];
      $.each(_data,function(i,row){
        a.push(row.id);
      })
      this.logger.debug("Result: " + a.join(', '));
    
    }

});

CellOperations.registerOperation(new MoveUpOperation());

var MoveDownOperation = BaseOperation.extend({

    id: "MOVE_DOWN",
    types: ["GenericMoveDown"],
    name: "Move Down",
    description: "Move down",
    icon: "getResource?resource=/images/NAV/down.png",
    hoverIcon: "getResource?resource=/images/NAV/down_mouseover.png",
    clickIcon: "getResource?resource=/images/NAV/down_onclick.png",

    constructor: function(){
      this.logger = new Logger("MoveDownOperation");
    },

    canExecute: function(tableManager){
    
      var rowIdx = tableManager.getSelectedCell()[0];
      var rowId = tableManager.getTableModel().getEvaluatedId(rowIdx);

      return !tableManager.getTableModel().getIndexManager().isLastChild(rowId);

    },


    execute: function(tableManager){

      // Move up: move the selected node and all children
      // up to the previous item

      var rowIdx = tableManager.getSelectedCell()[0];
      var colIdx = tableManager.getSelectedCell()[1];
      var rowId = tableManager.getTableModel().getEvaluatedId(rowIdx);

      var fromIdx = rowIdx;
      var toIdx = -1;

      var indexManager = tableManager.getTableModel().getIndexManager();
      var nextSibling = indexManager.getNextSibling(rowId);
      if (typeof nextSibling == 'undefined'){
        toIdx = indexManager.getLastChild(rowId).index;
      }
      else{
        toIdx = nextSibling.index - 1;
      }
      var targetIdx = parseFloat(indexManager.getLastChild(indexManager.getNextSibling(rowId).id).index);

      this.logger.debug("Moving nodes from " + fromIdx + " to " + toIdx + " to the place of " + targetIdx);

      // Build a new data array
      var _data = tableManager.getTableModel().getData();
      var _tmp = _data.splice(fromIdx, toIdx-fromIdx + 1);

      Array().splice.apply(_data,[targetIdx-toIdx+fromIdx,0].concat(_tmp));
      //_data = _data.slice(0,targetIdx-toIdx+fromIdx).concat(_tmp).concat(_data.slice(targetIdx-toIdx+fromIdx));
      tableManager.getTableModel().setData(_data);

      // Now do the same on the UI

      // move rows id: fromIdx -> toIdx to targetIdx
      for(var i = 0; i<= toIdx-fromIdx; i++){
        $('#'+tableManager.getTableId() + " > tbody > tr:eq("+ (targetIdx) +")").after(
          $('#'+tableManager.getTableId() + " > tbody > tr:eq("+ (fromIdx) +")")
        );
      }

      tableManager.setSelectedCell([targetIdx-toIdx+fromIdx,colIdx]);
      tableManager.updateOperations();
      
      /*
      tableManager.cleanSelections();
      tableManager.init();
      tableManager.selectCell(targetIdx-toIdx+fromIdx,colIdx);
      */

      var a = [];
      $.each(_data,function(i,row){
        a.push(row.id);
      })
      this.logger.debug("Result: " + a.join(', '));
    
    }

});

CellOperations.registerOperation(new MoveDownOperation());

var DeleteOperation = BaseOperation.extend({

    id: "Delete",
    types: ["GenericDelete"],
    name: "Delete",
    description: "Delete",
    icon: "getResource?resource=/images/NAV/remove.png",
    hoverIcon: "getResource?resource=/images/NAV/remove_mouseover.png",
    clickIcon: "getResource?resource=/images/NAV/remove_onclick.png",

    constructor: function(){
      this.logger = new Logger("DeleteOperation");
    },


    execute: function(tableManager){

      // Move up: move the selected node and all children
      // up to the previous item

      var rowIdx = tableManager.getSelectedCell()[0];
      var colIdx = tableManager.getSelectedCell()[1];
      var rowId = tableManager.getTableModel().getEvaluatedId(rowIdx);

      var fromIdx = rowIdx;
      var toIdx = -1;

      var indexManager = tableManager.getTableModel().getIndexManager();
      var nextSibling = indexManager.getNextSibling(rowId);
      if (typeof nextSibling == 'undefined'){
        toIdx = indexManager.getLastChild(rowId).index;
      }
      else{
        toIdx = nextSibling.index - 1;
      }
      
      // Store the parent to update the table
      var _parentId = indexManager.getIndex()[rowId].parent;
      
      //check if last in group, except in layout
      var deleteParent = tableManager.id != LayoutPanel.TREE &&
                         _parentId != IndexManager.ROOTID && 
                         indexManager.isFirstChild(rowId) && 
                         indexManager.isLastChild(rowId);
      if(deleteParent){
        //start deleting in parent
        fromIdx = indexManager.getIndex()[_parentId].index;
        //update grandpa
        _parentId = indexManager.getIndex()[_parentId].parent;
      }
      
      this.logger.debug("Deleting nodes from " + fromIdx + " to " + toIdx );
      
      // Build a new data array
      tableManager.getTableModel().getData().splice(fromIdx, toIdx-fromIdx + 1);
      indexManager.updateIndex();


      // Now do the same on the UI

      // move rows id: fromIdx -> toIdx to targetIdx
      for(var i = 0; i<= toIdx-fromIdx; i++){
        $('#'+tableManager.getTableId() + " > tbody > tr:eq("+ (fromIdx) +")").remove();
      }

      tableManager.cellUnselected();
      
      /*
      tableManager.cleanSelections();
      tableManager.init();
      tableManager.selectCell(targetIdx-toIdx+fromIdx,colIdx);
      */

      var a = [];
      $.each(tableManager.getTableModel().getData(),function(i,row){
        a.push(row.id);
      })
      this.logger.debug("Result: " + a.join(', '));

      // Update treeTable:
      tableManager.updateTreeTable(_parentId);
    
    }

});

CellOperations.registerOperation(new DeleteOperation());


var ApplyTemplateOperation = BaseOperation.extend({

    id: "APPLY_TEMPLATE",
    types: ["GenericApplyTemplate"],
    name: "Apply Template",
    description: "Applys a template.",
    icon: "getResource?resource=/images/NAV/loadtemp.png",
    hoverIcon: "getResource?resource=/images/NAV/loadtemp_mouseover.png",
    clickIcon: "getResource?resource=/images/NAV/loadtemp_onclick.png",

    constructor: function(){
      this.logger = new Logger("ApplyTemplateOperation");
    }

});

CellOperations.registerOperation(new ApplyTemplateOperation());

var SaveAsTemplateOperation = BaseOperation.extend({

    id: "SAVEAS_TEMPLATE",
    types: ["GenericSaveAsTemplate"],
    name: "Save as Template",
    description: "Save sa template.",
    icon: "getResource?resource=/images/NAV/savetemp.png",
    hoverIcon: "getResource?resource=/images/NAV/savetemp_mouseover.png",
    clickIcon: "getResource?resource=/images/NAV/savetemp_onclick.png",

    constructor: function(){
      this.logger = new Logger("SaveAsTemplateOperation");
    }

});

CellOperations.registerOperation(new SaveAsTemplateOperation());
