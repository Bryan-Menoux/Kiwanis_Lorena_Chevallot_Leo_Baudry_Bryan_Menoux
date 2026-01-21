# Commandes de diagnostic pour le serveur de production

## 1. Vérifier les logs PM2
pm2 logs kiwanis

## 2. Vérifier le statut PM2
pm2 status

## 3. Redémarrer l'application
pm2 restart kiwanis

## 4. Vérifier que le .env existe
ls -la /var/www/kiwanis/.env

## 5. Vérifier le contenu du .env
cat /var/www/kiwanis/.env

## 6. Vérifier que les fichiers API existent
ls -la /var/www/kiwanis/server/pages/api/

## 7. Tester l'endpoint API directement
curl -X POST https://kiwanis-pays-de-montbeliard.bryan-menoux.fr/api/get-user-full \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"userId":"ot2v5pxhszjs6ma"}'