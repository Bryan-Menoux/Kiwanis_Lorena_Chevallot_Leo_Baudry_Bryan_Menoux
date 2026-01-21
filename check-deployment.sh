# Vérification du déploiement
echo "=== Vérification des fichiers déployés ==="

echo "Contenu de /var/www/kiwanis/:"
ls -la /var/www/kiwanis/

echo ""
echo "Contenu de /var/www/kiwanis/server/:"
ls -la /var/www/kiwanis/server/

echo ""
echo "Fichier entry.mjs existe ?"
ls -la /var/www/kiwanis/server/entry.mjs

echo ""
echo "Fichier _noop-middleware.mjs existe ?"
ls -la /var/www/kiwanis/server/_noop-middleware.mjs

echo ""
echo "Contenu de /var/www/kiwanis/client/:"
ls -la /var/www/kiwanis/client/

echo ""
echo "Statut PM2:"
pm2 status

echo ""
echo "Test de l'endpoint API:"
curl -X POST https://kiwanis-pays-de-montbeliard.bryan-menoux.fr/api/get-user-full \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"userId":"test"}'