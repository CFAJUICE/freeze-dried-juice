
//compile scss
var sass = require('node-sass');
var fs = require('fs');
sass.render({
  file: 'public/main.scss'
}, function(err, result){
  if(err){
    console.log("SCSS ERROR:", err)
  }
  fs.writeFile('public/main.css', result.css, 'utf8', function(err){
    console.log('Error with compile sass', err);
  });
});

