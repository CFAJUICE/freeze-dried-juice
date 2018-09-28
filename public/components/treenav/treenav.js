(function () {
    'use strict';

    var mainApp = 'juice';
    var moduleName = 'treenav';
    helpers.addModuleToApp(mainApp, moduleName);
    var moduleReferenceName = mainApp + '.' + moduleName;

    angular.module(moduleReferenceName, []).
        service('TreeNavService', [TreeNavService]);


    function TreeNavService() {
		Node = function(id, posinset) {
		   this.id = id.replace(/\./g, "_");
		   this.expanded = false;
		   this.selected = false;
		   this.posinset = posinset;
		   this.parent = null;
		   this.children = [];
		}

        this.newNode = function(id, posinset) {
		   return new Node(id, posinset)
		}

		this.Tree = function() {
		   var node = new Node("root", 1)
		   this.root = node;
		   this.current = null;
		}

		
		this.Tree.prototype.firstChild = function() {
		   var node = null;
		   if (this.current.children.length > 0) node = this.current.children[0];
		   return node;
		}

		this.Tree.prototype.nextSibling = function() {
		   var node = null;
		   var index = this.current.posinset;
		   if (this.current.parent.children[index]) {
			  node = this.current.parent.children[index]; 
		   }
		   return node;
		}

		this.Tree.prototype.next = function() {
		   var node = this.nextSibling();
		   if (!node && this.current.parent.id != "root"){
			  var parentPos = this.current.parent.posinset;
			  node = this.current.parent.parent.children[parentPos] 
		   }
		   return node;
		}

		this.Tree.prototype.previousSibling = function() {
		   var node = null;
		   var index = this.current.posinset-2;
		   if (this.current.parent.children[index]) {
			  node = this.current.parent.children[index]; 
		   }
		   return node;
		}

		this.Tree.prototype.previous = function() {
		   var node = this.previousSibling();
		   if (node && node.expanded == true){
			  node = node.children[node.children.length-1];   //need to make it recursive!
		   } else if(!node && this.current.parent.id != "root") {
			  node = this.current.parent;
		   }
		   return node;
		}

        this.arrowKeys = function(tree, e) {
			 e.preventDefault();
			 var node;
			 if (e.keyCode === 40){ //down
				if (!tree.current.expanded){
				   node = tree.next();
				} else {
				   node = tree.firstChild();
				}   
				if (node){
				   tree.current = node;
				   $("#" + node.id).focus();
				}
			 }

			 if (e.keyCode === 38){ //up
				node = tree.previous(); 
				if (node){
				   tree.current = node;
				   $("#" + node.id).focus();
				}
			 }

			 if (e.keyCode === 39){ //right
				var node = tree.current;
				if (node.children.length > 0 && !node.expanded){
				   tree.current.expanded = true;
				   $("#" + node.id).attr("aria-expanded", "true");
				} else if(node.expanded) {
				   node = tree.firstChild();
				   tree.current = node;
				   $("#" + node.id).focus();
				}
			 }

			 if (e.keyCode === 37){ //left
				var node = tree.current;
				if (node.expanded){
				   tree.current.expanded = false;
				   $("#" + node.id).attr("aria-expanded", "false");
				} else if(node.parent.id != "root"){
					node = node.parent;
				   tree.current = node;
				   $("#" + node.id).focus();
				}
			 }		 

		  }
    }

})();