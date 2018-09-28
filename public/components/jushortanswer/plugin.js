CKEDITOR.plugins.add('jushortanswer',
   {
      requires : ['iframedialog'],
      init : function(editor) {
         var pluginName = 'jushortanswer';
         var mypath = this.path;
         editor.ui.addButton(
            'sa.btn',
            {
               label : "Insert Short Answer Inputs",
               command : 'jusa.cmd',
               icon : mypath + 'images/sa.png'
            }
         );



         CKEDITOR.dialog.addIframe(
            'jusa.dlg',
            'Short Answer Element',
            mypath + 'sadialog.html',
            900,
            700,
            function(){
            },
		    {   
				onShow: function() {
                   // The code that will be executed when a dialog window is loaded.
                   //var selection = editor.getSelection();
				   selection = this.getParentEditor().getSelection(); //need to get the current instance
				   console.log(selection);
				   var element = selection.getStartElement();
				   console.log("startElement",element);
				   if ( element )
                      element = element.getAscendant( 'jusa', true );
				   if ( !element || element.getName() != 'jusa' ) {
                      this.insertMode = true;
					  juGlobal_currentInputId = "";
                   } else {
                      this.insertMode = false;
					  var el = element.getAttribute("ju-sa");
					  juGlobal_currentInputId = el.slice(0, el.length-2);  //remove input-specific post-identifier
					  this.element = element;
                   }
				   console.log("insertMode", this.insertMode);
                },
				onOk: function() {
                   var displayId = function(id, k) {  //k is input index for multiple inputs
                      return id.slice(0,7)+".._"+k;
				   }
                   var dialog = this;
				   if (this.insertMode) {
                     document.getElementById(juGlobal_frameId).contentWindow.saveSA();
                     var htmlContent = "";
					 for (var k=0;k<juGlobal_inputData[juGlobal_currentInputId].noOfInputs ;k++ ){
						var saSpace =  CKEDITOR.dom.element.createFromHtml("<span>&nbsp;&nbsp;</span>");
						dialog.getParentEditor().insertElement(saSpace);
                        htmlContent = "<jusa style='background-color:yellow' ju-sa='"+juGlobal_currentInputId+"_"+k+"'><span style='background-color:#A3E4FF' ng-if='false'><strong> "+displayId(juGlobal_currentInputId, k)+"</strong></span><span class='ju-transparent-background'>&nbsp;&nbsp;</span></jusa>";
						var saPlaceHolder = CKEDITOR.dom.element.createFromHtml(htmlContent);
				        //saPlaceHolder.unselectable(); //???
				        dialog.getParentEditor().insertElement(saPlaceHolder);
					 }
					 
				     //htmlContent = "<jusa ju-sa='"+juGlobal_currentInputId+"' style='width:200px; background:#A3E4FF'><strong> "+displayId(juGlobal_currentInputId)+"</strong></jusa>"
				     
				     //document.getElementById(juGlobal_frameId).contentWindow.saveSA();	
				   } else {
					   document.getElementById(juGlobal_frameId).contentWindow.saveSA();
					  /* for (var k=0;k<juGlobal_inputData[juGlobal_currentInputId].noOfInputs ;k++ ){
                          
                       }
					   this.element.setAttribute('ju-sa', juGlobal_currentInputId);
					   this.element.setHtml("SA Placeholder <strong>ID: "+juGlobal_currentInputId+"</strong>");*/                       
				   }
                }
		    }
         );

		 editor.addCommand( 'jusa.cmd', new CKEDITOR.dialogCommand( 'jusa.dlg' ) );

		  if ( editor.contextMenu ) {
            editor.addMenuGroup( 'saGroup' );
            editor.addMenuItem( 'saItem', {
                label: 'Edit Short Answer',
                //icon: this.path + 'icons/abbr.png',
                command: 'jusa.cmd',
                group: 'saGroup'
            });

            editor.contextMenu.addListener( function( element ) {
                if ( element.getAscendant( 'jusa', true ) ) {
                    return { saItem: CKEDITOR.TRISTATE_OFF };
                }
            });
        }
      }
   }
);

