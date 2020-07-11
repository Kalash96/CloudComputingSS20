docker stop chatapp
docker rm chatapp
docker rmi chatapp
docker build -t chatapp .
docker run -p 3000:3000 -p 3001:3001 --name chatapp chatapp