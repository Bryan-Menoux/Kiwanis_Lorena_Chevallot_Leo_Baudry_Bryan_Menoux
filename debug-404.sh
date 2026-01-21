# Commandes de diagnostic pour le problème 404

# 1. Tester directement sur le port local 8085
curl -X POST http://127.0.0.1:8085/api/get-user-full \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN_REEL" \
  -d '{"userId":"ot2v5pxhszjs6ma"}'

# 2. Vérifier que l'app écoute sur le port 8085
netstat -tlnp | grep 8085

# 3. Vérifier les logs détaillés de l'app
pm2 logs kiwanis --lines 50

# 4. Tester une route simple (page d'accueil)
curl http://127.0.0.1:8085/

# 5. Vérifier la configuration nginx/apache
cat /etc/nginx/sites-available/kiwanis 2>/dev/null || echo "Pas de config nginx trouvée"
cat /etc/apache2/sites-available/kiwanis.conf 2>/dev/null || echo "Pas de config apache trouvée"

# 6. Vérifier si nginx/apache tourne
systemctl status nginx 2>/dev/null || systemctl status apache2 2>/dev/null || echo "Ni nginx ni apache ne tournent"

# 7. Vérifier les processus sur le port 8085
lsof -i :8085 2>/dev/null || echo "Rien n'écoute sur le port 8085"