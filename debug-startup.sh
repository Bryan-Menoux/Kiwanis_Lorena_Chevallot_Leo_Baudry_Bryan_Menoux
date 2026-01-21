# Diagnostic supplémentaire pour le problème de démarrage

echo "=== Vérification des fichiers ==="
ls -la /var/www/kiwanis/server/
ls -la /var/www/kiwanis/server/entry.mjs

echo ""
echo "=== Vérification des permissions ==="
ls -ld /var/www/kiwanis/
ls -ld /var/www/kiwanis/server/

echo ""
echo "=== Test des dépendances npm ==="
cd /var/www/kiwanis && npm ls --depth=0

echo ""
echo "=== Test de démarrage manuel (Ctrl+C pour arrêter) ==="
echo "Commande: cd /var/www/kiwanis && PORT=8085 HOST=127.0.0.1 node server/entry.mjs"
echo "Appuyez sur Ctrl+C après quelques secondes si ça démarre..."