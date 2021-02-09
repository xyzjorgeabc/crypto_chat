#! /bin/bash
echo "introduce la ip del servidor al que se conectará el front end:"
read ip 

sudo apt update 
sudo apt install openssl
sudo apt install nodejs
sudo apt install npm
sudo npm install -g webpack
sudo npm install -g webpack-cli
sudo npm install -g typescript

mkdir ./cert
openssl req -x509 -newkey rsa:4096 -keyout ./cert/server.key -out ./cert/server.cert -days 365
sed -i "s/localhost/$ip/gi" public/controller/messenger_controller.ts 
