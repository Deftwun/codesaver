var selectedSnippet ="", 
    editor, 
    menuCollapsed = false, 
    notepadCollapsed= true,
		pinned = false;

//Snippets Container
var snippets = {};

//Create a new snippet with a given name. 
//@name if the name already exists, a unique integer will be appended
//@content can be undefined
function createNewSnippet(name,content){
  name = name || 'untitled';
  var suffix = 1,
      unique = name;
  while(Object.keys(snippets).indexOf(unique) > -1){
    unique = name + "_" + suffix++;
  }  
  snippets[unique] = content || "'Hello World!'";
  selectedSnippet = unique;
  refreshSnippetsList();
	$("#snippet-header").select();
}

//Updates the snippet name to whatever is in the snippet header
function updateSnippetName(){
  var newName = $("#snippet-header").val();
  if (newName.trim() != "" && selectedSnippet != newName && selectedSnippet != undefined){
    var content = snippets[selectedSnippet];
    delete snippets[selectedSnippet];
    createNewSnippet(newName,content);
    $(".snippets").addClass("selected");
  }
}

//Delete the currently seelected snippet
function deleteCurrentSnippet(){
  var prevSelect = $(".selected").prev();
  delete snippets[selectedSnippet];
  selectedSnippet="";
  prevSelect.trigger("click");
  refreshSnippetsList();
}

//Display currently selected snippet in editor
function displayCurrentSnippet(){
  if (snippets[selectedSnippet]!=undefined){
     editor.setValue(snippets[selectedSnippet]);
     $("#snippet-header").val(selectedSnippet);
  }
  else {
    editor.setValue("");
    $("#snippet-header").val("");
  }
}

//Toggles menu collapsed
function toggleMenu(){
  menuCollapsed = !menuCollapsed;
  var leftPane = $("#menu-container"),
      margin = parseInt(leftPane.css("margin-left")),
      width = parseInt(leftPane.css("width")),
			borderWidth = parseInt(leftPane.css("border-left-width")),
      newMargin= margin < 0 ? 0 : (-width - borderWidth);
  $("#menu-container").animate({'margin-left':newMargin});
  var button = $("#toggle-menu i")
  if (menuCollapsed) {button.removeClass("fa-arrow-circle-left");
                      button.addClass("fa-arrow-circle-right");}
  else {button.removeClass("fa-arrow-circle-right");
             button.addClass("fa-arrow-circle-left");}
}

//Toggles Notepad collapsed
function toggleNotepad(){
  notepadCollapsed = !notepadCollapsed;
  var pane = $("#notepad"),
      margin = parseInt(pane.css("margin-right")),
      width = parseInt(pane.css("width")),
			borderWidth = parseInt(pane.css("border-right-width")),
      newMargin= margin < 0 ? 0 : (-width-borderWidth);
  $("#notepad").animate({'margin-right':newMargin});
  var button = $("#toggle-notepad i");
  
  if (notepadCollapsed) {
    button.removeClass("fa-arrow-circle-right");
    button.addClass("fa-arrow-circle-left");
  }
  else {
    button.removeClass("fa-arrow-circle-left");
    button.addClass("fa-arrow-circle-right");
  }
}

//Show the 'Settings' menu
function showSettings(){
  $("#snippets-menu").hide();
  $("#settings-menu").show();
}

//Hide the 'Settings' Menu
function hideSettings(){
  $("#snippets-menu").show();
  $("#settings-menu").hide();
}

//Apply options from the settings menu
function applySettings(){
  editor.setTheme($("#theme").val());
  editor.getSession().setMode($("#mode").val());
  editor.renderer.setShowGutter($("#show_gutter").is(":checked"));
  editor.renderer.setShowPrintMargin($("#display_print_margin").is(":checked"));
  $("#snippet-editor").css('font-size',$("#fontsize").val());
}

//Filters out snippet names in list based on search string
function filterList(){    
  var filterText = $("#filter").val().toLowerCase();
  var name,content;
  $(".snippet").each(function(){
    name = $(this).text();
    content = snippets[name];
    var match = name.toLowerCase().indexOf(filterText) > -1 || 
                content.toLowerCase().indexOf(filterText) > -1;
    if (match) $(this).show();
    else $(this).hide();
  });
}

//Update list of snippet names in left pane
function refreshSnippetsList(){
  $("#filter").val("");
  $('.snippet').remove();
  for (name in snippets){
    var elem = '<div class="snippet">' + name + '</div>';
    $("#snippet-list").append(elem);
    if (selectedSnippet == name){
      $(".snippet").last().trigger("click");
    }
  }
  displayCurrentSnippet();
}

//Toggle whether app is pinned (always on top)
function togglePinned(){
	pinned = !pinned;
	if (pinned){
		$("#pin i").removeClass("rotate-45")
		$("#pin i").addClass("fa-2x");
	}
	else {
		$("#pin i").addClass("rotate-45");
		$("#pin i").removeClass("fa-2x");
	}
	chrome.app.window.current().setAlwaysOnTop(pinned);
}


//http://www.html5rocks.com/en/tutorials/file/filesystem/

//Error callback used for google sync errors
function syncErrorCallback(e){
  console.log(e.name + " : " + e.message);
}

//Load snippets from storage
function loadSnippets(){
    
    //Use Chrome cloud storage (Web Store App)
    if (chrome && chrome.syncFileSystem){
      console.log("Load from google chrome filesystem");
       //Retrieve sync file system
      chrome.syncFileSystem.requestFileSystem(function(fs){
        //Get file
        fs.root.getFile('codesaver.json', {}, function(fileEntry) {
          //File Reader
          fileEntry.file(function(file) {
             var reader = new FileReader();
             reader.onloadend = function(e) {
                //recreate save object
                console.log("Loading from chrome.syncFileSystem: ",this.result);
                var storageObject = JSON.parse(this.result);
                snippets = storageObject.snippets || {};
                $("#notepad textarea").val(storageObject.notes || "This is a notepad!");
                if (storageObject.settings){
                  $("#theme").val(storageObject.settings.theme);
                  $("#show_gutter").attr('checked',storageObject.settings.showGutter);
                  $("#display_print_margin").attr('checked',storageObject.settings.showPrintMargin);
                  $("#fontsize").val(storageObject.settings.fontSize);
                }
                applySettings();
                refreshSnippetsList();
             };
             reader.readAsText(file);
          }, syncErrorCallback);

        }, syncErrorCallback);
      });
    }
  
    //Fallback to localstorage 
    //(localStorage is auto-periodically cleared in some environments/devices)
    //                      ^Should be a word right?
    else {
      console.log("Could not load. Chrome Sync filesystem not found. localStorage not yet supported.");
    }	
}

//Save snippets to storage
function saveSnippets(){
	var settingsObject = {'theme':$("#theme").val(),
                        'mode':$("#mode").val(),
                        'showGutter':$("#show_gutter").is(":checked"),
                        'showPrintMargin':$("#display_print_margin").is(":checked"),
                        'fontSize':$("#fontsize").val()};
	var storageObject = {'snippets':snippets,
	                     'notes':$("#notepad textarea").val(),
											 'settings':settingsObject};
  
  
  if (chrome && chrome.syncFileSystem){
    console.log("Saving to chrome.syncFileSystem: ",JSON.stringify(storageObject));
    //Retrieve sync file system
    chrome.syncFileSystem.requestFileSystem(function(fs){
      //Create File
      fs.root.getFile('codesaver.json', {create: true}, function(fileEntry) {        
        //Create File writer & save storage object
        fileEntry.createWriter(function(fileWriter) {
          var truncated = false;
          fileWriter.onwriteend = function(e) {
            if (truncated == false){console.log("truncating file"); this.truncate(this.position);};
            truncated = true;
            console.log('WriteCompleted');
          };
          fileWriter.onerror = function(e) {console.log('Write failed: ' + e.toString());};
          var blob = new Blob([JSON.stringify(storageObject)], {type: 'application/json'});
          fileWriter.write(blob); 
          
        }, syncErrorCallback); 
      }, syncErrorCallback);
    });
  }
  else {
    console.log("Could not save. Chrome storage not found. localStorage not yet supported.");
  }
}

$(document).ready(function(){

  //Create Editor (Pretty sure this must be created before doing anything else)
  editor = ace.edit("snippet-editor");
  editor.$blockScrolling = Infinity; //<< Removes ace warning message (scroll to cursor on change)
  applySettings();
 
  //Editor save on change event
  editor.getSession().on('change', function(e) {
    if (selectedSnippet.trim() == "" && editor.getValue().trim != "") return;
    snippets[selectedSnippet] = editor.getValue();
  });
  
  //Load snippets from storage on refresh
  loadSnippets();
  refreshSnippetsList();
  
  //CLICK EVENTS
  $("#settings-close").click(hideSettings);
  $("#settings-apply").click(applySettings);
  $("#new").click(function(){createNewSnippet("untitled")});
  $("#delete").click(deleteCurrentSnippet);
  $("#options").click(showSettings);
  $("#save").click(saveSnippets);
  $("#load").click(loadSnippets);
  $("#toggle-menu").click(toggleMenu);
  $("#toggle-notepad").click(toggleNotepad);
  $("#filter").change(filterList);
  $("#snippet-header").focus(function(){$('#snippet-header').select()});
  $("#snippet-header").blur(updateSnippetName);
  $("#snippet-header").mouseup(function(){return false;});	
  $("#pin").click(function(){console.log("clicked");togglePinned();});
  $("#close").click(function(){saveSnippets(); window.close()});
  $("#minimize").click(function(){chrome.app.window.current().minimize()});
	
	//Snippet name click event
  $(document).on("click",".snippet",function(){
    $('.snippet').removeClass("selected");
    $(this).addClass("selected");
    selectedSnippet = $(this).text();
    displayCurrentSnippet();
  });
  
  //Keep panel margins where they should be on window resize
  $(window).resize(function(){
    var setMarginNote = notepadCollapsed ? parseInt($("#notepad").css('width'))*-1 : 0,
        setMarginMenu = menuCollapsed ? parseInt($("#menu-container").css('width'))*-1 : 0;   
    $("#notepad").css({'margin-right':setMarginNote});
    $("#menu-container").css({'margin-left':setMarginMenu});
  });
});