var QBU_secretHandshake = "tester=true";
var QBU_dbid_common = "__COMMON_DBID__";
var QBU_dbid_common_tags = "__COMMON_TAGS_DBID__" //"bmh25ch6b";
var QBU_serverTime, QBU_deltaTime, QBU_s3programcusttime;
var QBU_cryptParams = ["mYXQ9CpT2hUksOx9LCSH", "/PnnyYipMEbWqpBeHzTneA=="];

function QBU_encryptedSecret() {
   var tester = sjcl.encrypt(QBU_cryptParams[0], (new Date().getTime() + QBU_deltaTime).toString(), {"iv":QBU_cryptParams[1],"salt":""});
   return encodeURIComponent(JSON.parse( tester).ct);
}

console.log('In common');


//what we are going to output:
$.extend({
    getUrlVars: function () {
        var vars = [], hash;
        var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
        for (var i = 0; i < hashes.length; i++) {
            hash = hashes[i].split('=');
            vars.push(hash[0]);
            hash[1] = decodeURIComponent(hash[1]);
            vars[hash[0]] = hash[1];
        }
        return vars;
    },
    getUrlVar: function (name) {
        return $.getUrlVars()[name];
    }
});


var tableIdMapping = {};
var QBU_isProgramCopy = false;
var QBU_programId = "";
//sets the table id mapping
function loadSchemaThenExecute(callback) {
    $.get(QBU_dbid, {a:"API_GetDBVar", varname:"program_id"}).done(function(result){
        var el = $(result).find("errcode");
        var err = $(el).text();
        if (err == 0){
            el = $(result).find("value");
            QBU_programId = $(el).text();
            if(QBU_programId && QBU_programId == '-') QBU_programId = "";
            if(QBU_programId) QBU_isProgramCopy = true;

        } else {
            QBU_isProgramCopy = false;
        }
        console.log( 'isProgramCopy', QBU_isProgramCopy)
        $.when(
            $.get(QBU_dbid, {a: "API_GetSchema"}).done(function (result) {
                $(result).find("chdbid").each(function (ind, el) {
                    var name = $(el).attr("name");
                    var id = $(el).text();
                    tableIdMapping[name] = $(el).text();
                })
            })
        ).then(callback);
    });
}

function getProgramId(callback){
    $.get(QBU_dbid, {a:"API_GetDBVar", varname:"program_id"}).done(function(result){
        var el = $(result).find("errcode");
        var err = $(el).text();
        if (err == 0){
            el = $(result).find("value");
            QBU_programId = $(el).text();
            if(QBU_programId && QBU_programId == '-') QBU_programId = "";
            if(QBU_programId) QBU_isProgramCopy = true;

        } else {
            QBU_isProgramCopy = false;
        }
        callback(QBU_programId);
    });
}

function doQuery(tableName, query, callback) {
    var tb = tableIdMapping[tableName];
    var records = $.get(QBU_db_baseURL + tableIdMapping[tableName], {
        a: "API_DoQuery",
        clist: "a",
        query: query
        //query: ""
        //query: "{14.EX.'" + moduletteName + "'}"
        //query: "{14.EX.'" + moduletteName + "'}AND{18.EX.'" + tabs[i] + "'}"
    });
    records.done(function (result) {
        var out = [];
        $(result).find("record").each(function (ind, record) {
            var record_obj = {}
            $(record).children().each(function (c_index, child) {
                var key = $(child).prop('nodeName');
                var value = $(child).text();
                record_obj[key] = value;
            })
            out.push(record_obj);
        });
        callback(out);
    });
    return records;
}


//go through each of the fields in a record and remap them to output fields
//initial object is optional and will result in remapped fields appended to object
function remapRecord(record, remap, initial_object){
    var out = {};
    if(initial_object){
        out = initial_object;
    }
    for(var new_key in remap){
        var old_key = remap[new_key];
        out[new_key] = record[old_key];
    }
    return out;
}


function makeStringIntoValidId(str){
    return str.toLowerCase().split(" ").join("_").replace(/[&\/\\#,+()$~%.'":*?\!<>{}]/g,'');
}

function programPrefix(sep = '/') {
    return QBU_isProgramCopy ? "programs" + sep + QBU_programId + sep : "";
}