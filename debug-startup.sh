# Diagnostic supplémentaire pour le problème de démarrage

echo "=== Vérification des fichiers ==="
ls -la /var/www/kiwanis/server/
ls -la /var/www/kiwanis/server/entry.mjs

echo ""
echo "=== Vérification package.json ==="
ls -la /var/www/kiwanis/package.json

echo ""
echo "=== Vérification des permissions ==="
ls -ld /var/www/kiwanis/
ls -ld /var/www/kiwanis/server/

echo ""
echo "=== Test des dépendances npm ==="
cd /var/www/kiwanis && npm ls --depth=0

echo ""
echo "=== Test de démarrage manuel (timeout 5s) ==="
cd /var/www/kiwanis
timeout 5s env PORT=8085 HOST=127.0.0.1 node server/entry.mjs 2>&1 || echo "Démarrage échoué ou timeout"
echo ""
echo "=== Vérification du dist distant ==="
ls -la /var/www/kiwanis/dist/ 2>/dev/null || echo "Pas de répertoire dist"