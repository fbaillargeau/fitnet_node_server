-- Lancement du container docker
docker run -d -p 6379:6379 redis

-- Création du container docker
docker build -t <nom_conteneur> . 

-- Lancement de l'application avec le container docker
docker run -d -p <port_souhaité>:3123 <nom_conteneur>

-- Lancement de l'application avec nodemon (dans les dépendances de dev)
npx nodemon app.js



