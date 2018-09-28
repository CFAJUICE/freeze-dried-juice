sudo echo; for pid in $(ps -ef | grep "node" | awk '{print $2}'); do sudo kill -9 $pid; done
cd /home/ubuntu/sites/dev.juiceyourskills.com
git pull;
echo '' > output.log
echo '' > nohup.out
nohup npm start &
nohup npm run gitman &

cd /home/ubuntu/sites/www.juiceyourskills.com
git pull;
echo '' > output.log
echo '' > nohup.out
nohup npm start &
# cd /home/ubuntu/sites/test.juiceyourskills.com
# git pull;
# echo '' > nohup.out
# nohup npm start &
echo 'done - press return to continue. NOTE: services will take about 5 minutes before they are finished coming online.'
