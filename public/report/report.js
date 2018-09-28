$(document).ready(function(){
    $.datepicker.setDefaults( {} )
    $('#start_date').datetimepicker();
    $('#end_date').datetimepicker();
    var date = new Date();
    var end_date = date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate() + ' 00:00';

    var start_month = date.getMonth();
    var start_year = date.getFullYear();
    if(start_month == 0){
        start_month = 12;
        start_year = start_year - 1;
    }
    var start_date = start_year + '/' + start_month + '/' + date.getDate() + ' 00:00';
    if(!$('#start_date').val()){
	$('#start_date').val(start_date);
    }
    if(!$('#end_date').val()){
	$('#end_date').val(end_date);
    }
});
