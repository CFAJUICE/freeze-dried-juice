# Data-store-api 

### Purpose
 
To provide a universal interface for all widgets to be able to record 
data continuously for a user's progress 

### How to use as a widget creator
 
In the modulette controller, when a new widget is displayed, a new 
"widget session" is created using the DataStoreService.createSession 
command. This creates an object with the widget name, a unique session 
id, and the file name for the widget data. This is assigned to 
interactiveData.widgetSession so that the internals of a widget can 
access it. 

The widgetSession has a function save(data, complete), that takes in 
two parameters
 
* data: an object containing all records of the user's activity in the widget 
* complete: a boolean that is set to true if the user has made it 
through the entire content of the widget or game 

You can and should call save repeatedly in your widget. Each time you 
do, it will overwrite the data for the widget session in the database. 
This means, that as you progress through a widget, you should be 
adding to the the data object and each time you save it should contain 
all of the progress so far in that widget session. The structure of 
the data object is up to you, but it should be something that could be 
easily parsed apart for future analysis. 

Ideally, saving will happen for each meaningful user action. For the 
most part, complete should be set to false until the last action is 
done in a widget, and then saved as true. 

### Looking at the data
 
You can go to the url path: /juice/records and see all records that in 
the db. This is of course a temporary thing, as this page will get 
massive once we start having actual users using the system. Betsy, we 
will eventually need to think of how we will want to query and view 
this data 

### Nuts and bolts (how it works)
 
when the createSession command happens, it makes a new session object, 
but that is not saved yet. The object has the save function on it, and 
when that is called, a POST is made with all of the relevant data to 
/juice/record. If you make a normal GET call to /juice/record by going 
to that url in your browser, you will see a form that is used to POST 
to /juice/record. This can be used to test the api backend. All 
records are stored in the "records" collection in mongodb. The widget 
session id is set to the field _id in the database, which is the 
unique identifier in mongo, so it will overwrite each time the session 
is resaved. 