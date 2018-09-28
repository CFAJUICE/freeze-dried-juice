$(document).ready(function() {
    'use strict';

    var initial_params = {
        'context_id':'juicetestaccount',
        'context_label':'assignment',
        'context_title':'assignment',
        'custom_programid':'',
        'custom_program_key':'AAGS',
        'custom_juiceStatus':'true',
        'custom_source':'123UserId',
        'custom_studentId':'123UserId',
        'custom_target_id':'',
        'launch_presentation_document_target':'frame',
        'launch_presentation_locale':'en-US',
        'lis_person_contact_email_primary':'aj bahcmcom@collegeforamerica.org',
        'lis_person_name_family':'BAhealthcareComm',
        'lis_person_name_full':'CAD BAhealthcareComm',
        'lis_person_name_given':'CAD',
        'lis_person_sourcedid':'S3294476',
        'lti_message_type':'basic-lti-launch-request',
        'lti_version':'LTI-1p0',
        'oauth_callback':window.location.href.replace('oauth_test/', '') + 'juice/module/QS1.basic_math',
        'oauth_consumer_key':'jcx5yvvq2y2s1wcqixquukaxj3_test',
        'oauth_nonce': 'generated',
        'oauth_signature': 'generated',
        'oauth_signature_method':'HMAC-SHA1',
        'oauth_timestamp':'generated',
        'oauth_version':'1',
        'roles':'Student',
        'tool_consumer_instance_guid':'vle.uni.ac.uk',
        'user_id':'003E0000010HLeuIAG'
    };


    var pilots = {
        HES:  {
            "custom_source": "harvardextension",
            "context_id": "harvardextension",
            "lis_person_contact_email_primary": "nobody@harvard.com",
            "lis_person_name_family": "Student",
            "lis_person_name_full": "HarvardEx Student",
            "lis_person_name_given": "HarvardEx",
            "roles": "Student",
            "context_label": "assignment",
            "context_title": "assignment",
            "custom_programid": "AAGS",
            "custom_juicestatus": "true",
            "lis_person_sourcedid": "S3294476",
            "tool_consumer_instance_guid": "harvardextension",
            "form_label":"Login to Juice via Harvard Extension"
        }
    }

    if(pilot!=='PILOT'){
        pilot = pilots[pilot];
        $('body').addClass('pilot-study');
        $('#user-id-container label').text('Username');
        $('#user-id-container input').val('').attr('placeholder', 'Enter your username');
        $('fieldset legend').text(pilot.form_label);
        for(var key in pilot){
            initial_params[key] = pilot[key];
            $('#'+key).val(pilot[key]);
        }
    }

    if(user_group!=='super'){
        $("input[type='text']").attr("readonly", "readonly");
        $('#custom_target_id').attr("readonly", false);
        $('#resource_link_id').attr("readonly", false);
        $('#custom_source').attr("readonly", false);
    }
    if(user_group==='pilot'){
        $('#user-id-container input').attr('readonly', false);
    }

    $('#page-oauth-form').show();

    var field_updates_at_generated_inputs = false;
    $('#params > p').each(function(){
        var p = $(this);
        var field_name = p.find('input').attr('name');
        p.attr('id', 'field-container-'+field_name)
        console.log(field_name);
        addCloseToParameterPTag(p);
        addPostGet(p, field_name);
    });

    function addCloseToParameterPTag(p, force){
        if(p.find('label').text().indexOf('generated') !== -1){
            field_updates_at_generated_inputs = true;
        }
        if(field_updates_at_generated_inputs && !force){
            return;
        }
        var close = $.parseHTML('<span class="small-button close">X</span>');
        p.append(close);
        p.find('.close').click(function(){
            console.log('click');
            p.hide('fast', function(){p.remove();});
        });
    }

    function addPostGet(p, field_name, force){
        if(field_updates_at_generated_inputs && !force){
            return;
        }
        var postGet = $.parseHTML('<select class="post-get" id="post-get-'+field_name+'"><option value="post">post</option><option value="get">get</option></select>');
        p.find('label').append(postGet);
    }


    $('#add-parameter').click(function addParameter(){
        var id = Math.floor(Math.random()*10000);
        //var html = '<p><label><input type="text" class="label-input" id="label-'+id+'></label><input id="input-'+id+'type="text" name="" value=""></p>';
        var html = '<p id="'+id+'"><label><span style="float:left">Field:</span><input class="label-input" type="text">&nbsp;&nbsp;Value:</label><input type="text" class="new-param" name="custom_target_id" value=""></p>';
        $('#new-params').prepend(html);
        var p = $('#'+id);
        var param = p.find('.new-param');
        var label = p.find('.label-input')
        addCloseToParameterPTag(p, true);
        label.change(updateParam);
        label.keyup(updateParam);
        function updateParam(){
            param.attr('placeholder', 'Enter a value for '+label.val());
            param.attr('name', label.val());
        }
    });



    function addParams(){
        var params = $('#params');
        params.append('<h3 style="clear:both">Params</h3>');
        for(var key in initial_params){
            var val = initial_params[key];
            var label = key;
            var disabled = '';
            if(val=='generated'){
                label = key+ ' (generated)';
                disabled = 'READONLY'
            }
            var field = '<p><label>' + label + '</label>' + '<input type="text" id="'+key+'" name="'+key+'" value="'+val+'" '+disabled+'>';
            params.append(field);
        }
    }
    //addParams();

    function randomString(size, valid_characters){
        if(!valid_characters){
            valid_characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        }
        var out = '';
        for(var i=0; i<size; i++){
            var char_index = Math.floor(Math.random()*valid_characters.length);
            var char = valid_characters[char_index];
            out+=char;
        }
        return out;
    }
    $('#url').val(window.location.href.replace('oauth_test/', '') + 'juice/');

    function generate(){
        $('#oauth_nonce').val(randomString(16));
        $('#oauth_timestamp').val(Math.floor((new Date()).getTime()/1000));
        $('input').each(function(){
            var name = $(this).attr('name');
            if(name === 'custom_target_id' || name ==='resource_link_id'){
                $(this).val($(this).val().trim());
            }

        })
        generateURL();
    }

    generate();
    $('#generate_new').click(generate);
    $('input').keyup(generate);
    $('input').click(generate);

    var users = [];
    function createUserButtons(){
        if(user_group !== 'super'){
            return;//only super users get buttons
        }
        $.getJSON( "/oauth_test/users.json", function( data ) {
            users = data;
            users.forEach(function(u, index){
                var button = '<input type="button" data-user_index="'+index+'" value="'+ u.roles+'-'+ u.lis_person_name_given +'">';
                $('#user_config_buttons').append(button);
            });
            $('#user_config_buttons input').click(function(){
                var index = $(this).data('user_index');
                var user = users[index];
                for(var key in user){
                    var val = user[key];
                    $('#'+key).val(val);
                }
                generate();
            });
        });
    }
    createUserButtons();
    function generateURL(){
        var httpMethod = 'POST',
            o_url = $('#oauth_form').attr('action'),
            parameters = {
                oauth_nonce : $('#oauth_nonce').val(),
                oauth_timestamp : $('#oauth_timestamp').val(),
                oauth_signature_method : $('#oauth_signature_method').val(),
                oauth_version : $('#oauth_version').val(),
                oauth_callback : $('#oauth_callback').val()
            };

        var oauth_shared_secrets = {
            'oauth_test_page.juiceyourskills.com': consumer_secret
        }
        if(!$('#consumer_secret').val()) {
            $('#consumer_secret').val(consumer_secret);
        }
        var consumerSecret = $('#consumer_secret').val();
        $('#submit').removeAttr('disabled');
        $('#consomer_secret_message').hide();
        if(!consumerSecret) {
            consumerSecret = ('#consumer_secret').val();
        }
        if(!consumerSecret){
            consumerSecret = consumer_secret;
        }

        if(!$('#consumer_secret').val()) {
            $('#consumer_secret').val(consumerSecret);
        }
        /*
        if(!consumerSecret){
            var do_empty_key = false;
            var cur_input_value = $('#consumer_secret').val();
            for(var key in oauth_shared_secrets){
                var secret = oauth_shared_secrets[key];
                if(cur_input_value===secret){
                    //user has entered an unknown tool consumer id, but input still is using known shared secret, clear it
                    $('#consumer_secret').val('');
                    cur_input_value = '';
                    consumerSecret = '';
                }
            }
        }else{
            $('#consumer_secret').val(consumerSecret);
        }
        */
        /*
        if($('#consumer_secret').val()===''){
            $('#submit').attr('disabled', 'disabled');
            $('#consumer_secret_message').text('Shared secret not available on this client for that tool consumer! (you can enter the secret' +
                '   if you know it)');
        }else{
            $('#submit').removeAttr('disabled');
            $('#consumer_secret_message').text('');
        }
        */
        var parameters = {};
        var form = $('#oauth_form').serializeArray();
        for(var key in query_params){
            form.push({name:key, value:query_params[key]})
        }
        form = form.sort(function(a, b){
            if(a.name < b.name) return -1;
            if(a.name > b.name) return 1;
            return 0;
        });
        form.forEach(function(element){
            var skipped_fields = ['oauth_signature', 'url', 'method', 'debug'];
            if(skipped_fields.indexOf(element.name) > -1){
                return ; //continue
            }
            parameters[element.name] = element.value;
        });
        var url = window.location.protocol + '//' + window.location.host + $('#oauth_form').attr('action');
        console.log('o_url', url);
        // generates a BASE64 encode HMAC-SHA1 hash
        var signature = decodeURIComponent(oauthSignature.generate(httpMethod, url, parameters, consumerSecret));

        console.log(['test', 'POST', url, parameters, consumerSecret]);
        $('#oauth_signature').val(signature);
        parameters.oauth_signature = signature;
        var url = $('#url').val() + '?' + serialize(parameters);
        console.log(url);
        $('#generated_url').attr('href', url).text(url);
    }

    var query_params = {};
    var did_submit_query_updates = false;
    $('#oauth_form').submit(function(){
        //if(did_submit_query_updates) return true;
        var form = $('#oauth_form').serializeArray();
        form.forEach(function(element){
            var name = element.name;
            var post_or_get = $('#post-get-'+name).val();
            if(post_or_get==='get') {
                $('p#field-container-' + element.name).find('input').prop('disabled', true);
                query_params[name] = element.value;
            }
            console.log(name, post_or_get);
        });
        var query_string = $.param(query_params);
        var action = '/juice/process_oauth' +  '?' + query_string;
        $('#oauth_form').attr('action', action);
        generateURL();
        did_submit_query_updates = true;
        setTimeout(function(){
            $('input').removeAttr('disabled');
        }, 1000);
        //$('#oauth_form').submit();
        //return false;
    });


    function serialize (obj) {
        var str = [];
        for(var p in obj)
            if (obj.hasOwnProperty(p)) {
                str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
            }
        return str.join('&');
    };

});

