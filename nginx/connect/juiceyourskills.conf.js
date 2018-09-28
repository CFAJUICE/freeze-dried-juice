# added the js to the filename to make it so emacs would do nice indents

# - if we decide to redirect all http requests to https
#server {
#    listen 80 default_server;
#    listen [::]:80 default_server;
#    server_name default_server dev.juiceyourskills.com www.juiceyourskills.com test.juiceyourskills.com git.juiceyourskills.com
#    return 301 https://$server_name$request_uri;
#}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    if ($host = 'www.connect.juiceyourskills.com') {
	return 301 https://connect.juiceyourskills.com$request_uri;
    }
    return 301 https://$host$request_uri;
}



server {
    listen 443 default_server ssl;
    server_name localhost;
    client_max_body_size 100M;

    add_header Access-Control-Allow-Origin *;

    ssl_certificate /etc/nginx/ssl/juiceyourskills_com.combined.crt;
    ssl_certificate_key /etc/nginx/ssl/star_juiceyourskills_com.key;

    location / {
	proxy_pass       http://localhost:9000;
	proxy_set_header Host      $host;
	proxy_set_header X-Real-IP $remote_addr;
    }

    error_page 502 /server_error.html;

    location ~ \.(gif|jpg|png|js|txt|html|mp3|css)$ {
        root /home/ubuntu/sites/connect.juiceyourskills.com/public;
	expires 30d;
    }
}



server {
    listen 443 ssl;
    server_name connect.juiceyourskills.com;
    client_max_body_size 100M;
    ssl_certificate /etc/nginx/ssl/juiceyourskills_com.combined.crt;
    ssl_certificate_key /etc/nginx/ssl/star_juiceyourskills_com.key;

    location / {
	proxy_pass       http://localhost:9000;
	proxy_set_header Host      $host;
	proxy_set_header X-Real-IP $remote_addr;
    }
    error_page 502 /server_error.html;

    location ~ \.(gif|jpg|png|js|txt|html|mp3|css)$ {
        root /home/ubuntu/sites/connect.juiceyourskills.com/public;
    }
}
