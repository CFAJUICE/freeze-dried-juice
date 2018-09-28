CKEDITOR.plugins.add('jumultchoice',
   {
      requires : ['iframedialog'],
      init : function(editor) {
         var pluginName = 'jumultchoice';
         var mypath = this.path;
         editor.ui.addButton(
            'mc.btn',
            {
               label : "Insert Multiple Choice Question",
               command : 'jumc.cmd',
               icon : mypath + 'images/mc.png'
            }
         );



         CKEDITOR.dialog.addIframe(
            'jumc.dlg',
            'Multiple Choice Element',
            mypath + 'mcdialog.html',
            900,
            700,
            function(){
            },
		    {   
				onShow: function() {
                   // The code that will be executed when a dialog window is loaded.
                   //var selection = editor.getSelection();
				   //juGlobal variables deined in author.js
				   selection = this.getParentEditor().getSelection(); //need to get the current instance
				   //console.log(selection);
				   var element = selection.getStartElement();
				   //console.log("startElement",element);
				   if ( element )
                      element = element.getAscendant( 'jumc', true );
				   if ( !element || element.getName() != 'jumc' ) {
                      this.insertMode = true;
					  juGlobal_currentInputId = "";
                   } else {
                      this.insertMode = false;
					  juGlobal_currentInputId = element.getAttribute("ju-mc");
					  this.element = element;
					  //console.log("juGlobal_currentInputId", juGlobal_currentInputId);
                   }
				   //console.log("insertMode", this.insertMode);
                },
				onOk: function() {
                   var displayId = function(id) { 
                      return id.slice(0,7)+"...";
				   }
                   var dialog = this;
				   if (this.insertMode) {
					 var saSpace =  CKEDITOR.dom.element.createFromHtml("<span>&nbsp;&nbsp;</span>");
					 if (juGlobal_mcType == 'MC') {
                          var htmlContent = "<jumc ju-mc='"+juGlobal_currentInputId+"' style='width:200px; background:#A3E4FF'>MC Placeholder <br/><strong>ID: "+displayId(juGlobal_currentInputId)+"</strong></jumc>"; 
					 } else {
						  var htmlContent = "<jumc ju-mc='"+juGlobal_currentInputId+"' style='width:200px; background:#A3E4FF'>&nbsp;&nbsp;<strong>ID: "+displayId(juGlobal_currentInputId)+"</strong></jumc>";
					 }
				     var mcPlaceHolder = CKEDITOR.dom.element.createFromHtml(htmlContent);
				     mcPlaceHolder.unselectable(); //???
				     dialog.getParentEditor().insertElement(mcPlaceHolder);
					 dialog.getParentEditor().insertElement(saSpace);
				     document.getElementById(juGlobal_frameId).contentWindow.saveMC();	
				   } else {
					   this.element.setAttribute('ju-mc', juGlobal_currentInputId);
					   if (juGlobal_mcType == 'MC') {
                          this.element.setHtml("MC Placeholder <br/><strong>ID: "+displayId(juGlobal_currentInputId)+"</strong>");
					 } else {
						  this.element.setHtml("<strong>ID: "+displayId(juGlobal_currentInputId)+"</strong>");
					 }
					   
                       document.getElementById(juGlobal_frameId).contentWindow.saveMC();
				   }
                }
		    }
         );

		 editor.addCommand( 'jumc.cmd', new CKEDITOR.dialogCommand( 'jumc.dlg' ) );

		  if ( editor.contextMenu ) {
            editor.addMenuGroup( 'mcGroup' );
            editor.addMenuItem( 'mcItem', {
                label: 'Edit Multiple Choice',
                //icon: this.path + 'icons/abbr.png',
                command: 'jumc.cmd',
                group: 'mcGroup'
            });

            editor.contextMenu.addListener( function( element ) {
                if ( element.getAscendant( 'jumc', true ) ) {
                    return { mcItem: CKEDITOR.TRISTATE_OFF };
                }
            });
        }
      }
   }
);

