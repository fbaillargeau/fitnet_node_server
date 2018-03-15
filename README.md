-- Lancement du container docker
docker run -d -p 6379:6379 redis

-- Lancement de l'application avec nodemon (dans les dépendances de dev)
npx nodemon app.js
