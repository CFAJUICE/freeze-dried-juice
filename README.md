# Juice

## License

Unless otherwise noted, non-code content in this project is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License:

https://creativecommons.org/licenses/by-sa/4.0/

and unless otherwise noted, source code is licensed under the terms of the MIT license (located in project_root/MIT_LICENSE.txt)

## How To Set Up Freeze-Dried-Juice (JUICE without need of AWS and quickbase and without authoring/cms capabilities)

These Juice install steps work for Ubuntu 18. Just can run on most other systems, but some install steps might be different.

* `git clone git@github.com:CFAJUICE/Juice.git`
* Install mongodb community server: https://www.mongodb.com/download-center?jmp=nav#community
* `systemctl enable mongod.service`
* `sudo systemctl start mongod`
* Install nodejs (we are using 10. Other versions _might_ cause issues). https://nodejs.org/en/download/package-manager/
* npm i npm@latest -g
* apt-get install g++
* `cd Juice`
* `npm install nodemon -g`
* `npm install bower -g`
* `bower --allow-root install`
* `npm install`
* `cp configs/default.json configs/local.json`
* edit configs/local.json replacing any SETME values
* edit public/components/configs/configs.js and replace s3 paths with your own
* Import mongo search index data: in /public/data/mongo_data run "restore dump"
* go back to the project root directory
* npm start

## Nginx

Much of the site is rendered from static files, and nginx provides a performance boost compared to having node serve these files up. As such it is recommened you set the port for node to something other than 80, and set up nginx to serve the static files and requests to the node app.

* Install nginx: https://nginx.org/en/docs/install.html
* Use the config file in nginx/basic/default.conf. This will provide a http (port 80) site. 

 
### Further info

Almost all responses that node.js issues are from routes/juice.js. This is where api requests go through, as well as the general site loading.

Angular.js code is in public/components/ and each page, directive, and service gets it's own directory. In the directory is the js code, html templates, related images specific for that component (though most are just in public/images), as well as scss files for generating style sheets.

public/main.scss contains all of the references to the scss files in the components and items should be added there

/client_js_files.json contain a list of all js files that are loaded into the site. New files should be added in the "compiled" array.

Jade templates are used a little for the site, but basically just to give the general framework of the html, and to load all the js assets. They are located in the views directory and rarely need to be updated.

## Documentation

See the Documentation directory for additional information about working with the JUICE site.  It contains the following:

* Basic instructions for accessing JUICE and customizing the site UI
* Technical documentation for the JUICE games
* Information about managing and customizing JUICE using Quick Base
* Additional JUICE Content authoring instructions and tips

