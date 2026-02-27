<?php
// Simple Voalle proxy for shared hosting (Hostinger PHP)
// Exposes: /api/voalle/*
//
// IMPORTANT:
// - Put credentials in this file OR (better) in environment/hosting config.
// - Adjust token request according to your Voalle authentication method.

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// -------- CONFIG --------
$VOALLE_BASE_URL = getenv('VOALLE_BASE_URL') ?: 'https://SUA_VOALLE/api';
$VOALLE_TOKEN_URL = getenv('VOALLE_TOKEN_URL') ?: 'https://SUA_VOALLE/oauth/token';
$VOALLE_CLIENT_ID = getenv('VOALLE_CLIENT_ID') ?: 'coloque_aqui';
$VOALLE_CLIENT_SECRET = getenv('VOALLE_CLIENT_SECRET') ?: 'coloque_aqui';

// -------- TOKEN CACHE (file) --------
$cacheFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'voalle_token_cache.json';

function readCache($file) {
  if (!file_exists($file)) return null;
  $raw = @file_get_contents($file);
  if (!$raw) return null;
  $data = json_decode($raw, true);
  return is_array($data) ? $data : null;
}

function writeCache($file, $data) {
  @file_put_contents($file, json_encode($data));
}

function httpRequest($method, $url, $headers = [], $body = null) {
  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
  curl_setopt($ch, CURLOPT_HEADER, true);
  curl_setopt($ch, CURLOPT_TIMEOUT, 30);
  if ($body !== null) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
  }
  if (!empty($headers)) {
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
  }
  $resp = curl_exec($ch);
  $err = curl_error($ch);
  $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
  curl_close($ch);

  if ($resp === false) {
    return [0, [], json_encode(['error' => $err])];
  }

  $headerRaw = substr($resp, 0, $headerSize);
  $bodyRaw = substr($resp, $headerSize);
  return [$status, $headerRaw, $bodyRaw];
}

function getToken($tokenUrl, $clientId, $clientSecret, $cacheFile) {
  $cache = readCache($cacheFile);
  $now = time();
  if ($cache && isset($cache['access_token'], $cache['expires_at']) && $now < ($cache['expires_at'] - 30)) {
    return $cache['access_token'];
  }

  $payload = http_build_query([
    'grant_type' => 'client_credentials',
    'client_id' => $clientId,
    'client_secret' => $clientSecret,
  ]);

  [$status, $_headers, $body] = httpRequest('POST', $tokenUrl, [
    'Content-Type: application/x-www-form-urlencoded'
  ], $payload);

  if ($status < 200 || $status >= 300) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao obter token', 'status' => $status, 'body' => $body]);
    exit;
  }

  $data = json_decode($body, true);
  $token = $data['access_token'] ?? null;
  $expiresIn = intval($data['expires_in'] ?? 3600);
  if (!$token) {
    http_response_code(500);
    echo json_encode(['error' => 'Token inválido', 'body' => $body]);
    exit;
  }

  writeCache($cacheFile, [
    'access_token' => $token,
    'expires_at' => $now + $expiresIn
  ]);

  return $token;
}

// -------- ROUTING --------

// Example: /api/voalle/health
$uri = $_SERVER['REQUEST_URI'];
// Remove query
$path = parse_url($uri, PHP_URL_PATH);

if ($path === '/api/voalle/health') {
  echo json_encode(['ok' => true, 'service' => 'voalle-php-proxy', 'time' => date('c')]);
  exit;
}

// Forward everything under /api/voalle to VOALLE_BASE_URL
$forwardPath = preg_replace('#^/api/voalle#', '', $path);
$qs = $_SERVER['QUERY_STRING'] ?? '';
$forwardUrl = rtrim($VOALLE_BASE_URL, '/') . $forwardPath . ($qs ? ('?' . $qs) : '');

$token = getToken($VOALLE_TOKEN_URL, $VOALLE_CLIENT_ID, $VOALLE_CLIENT_SECRET, $cacheFile);

$method = $_SERVER['REQUEST_METHOD'];
$input = file_get_contents('php://input');
$headers = [
  'Authorization: Bearer ' . $token,
  'Content-Type: application/json'
];

[$status, $respHeaders, $respBody] = httpRequest($method, $forwardUrl, $headers, in_array($method, ['GET','HEAD']) ? null : $input);

http_response_code($status ?: 500);

// Try to keep JSON responses as-is
echo $respBody;
