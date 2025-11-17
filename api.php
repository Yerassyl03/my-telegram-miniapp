<?php
// api.php — простой JSON API на PHP 8
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

function read_json_body(): array {
  $raw = file_get_contents('php://input') ?: '';
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}
function load_kb(): array {
  $p = __DIR__ . '/kb.json';
  if (!file_exists($p)) return [];
  $json = file_get_contents($p);
  return json_decode($json, true) ?: [];
}
function is_malicious_query(string $text): bool {
  $bad = [
    'как взломать','взломать','ddos','sqlmap','bruteforce','брутфорс',
    'обойти защит','payload','эксплойт','reverse shell','флуд','флудить'
  ];
  $low = mb_strtolower($text, 'UTF-8');
  foreach ($bad as $w) if (str_contains($low, $w)) return true;
  return false;
}
function json_out(array $arr): void { echo json_encode($arr, JSON_UNESCAPED_UNICODE); exit; }

$action = $_GET['action'] ?? 'chat';
$body   = read_json_body();
$lang   = ($body['lang'] ?? 'ru') === 'kz' ? 'kz' : 'ru';
$kb     = load_kb();

if ($action === 'topics') {
  $topics = [
    ['title'=>$lang==='ru'?'Фишинг':'Фишинг', 'prompt'=>$lang==='ru'?'Как понять, что письмо — фишинг?':'Хаттың фишинг екенін қалай білуге болады?'],
    ['title'=>$lang==='ru'?'Пароли и 2FA':'Құпиясөз және 2FA', 'prompt'=>$lang==='ru'?'Как выбрать пароль и включить 2FA?':'Құпиясөзді қалай таңдап, 2FA қалай қосамын?'],
    ['title'=>$lang==='ru'?'Публичный Wi-Fi':'Қоғамдық Wi-Fi', 'prompt'=>$lang==='ru'?'Опасно ли входить в аккаунт в кафе Wi-Fi?':'Кафедегі Wi-Fi арқылы аккаунтқа кіру қауіпті ме?'],
    ['title'=>$lang==='ru'?'Кибербуллинг':'Кибербуллинг', 'prompt'=>$lang==='ru'?'Что делать при травле в сети?':'Желіде қудалау болса не істеу керек?']
  ];
  json_out(['topics'=>$topics]);
}

if ($action === 'threats') {
  $items = $kb['threats_top10'] ?? [];
  $list  = [];
  foreach ($items as $i) {
    $t = $lang==='ru' ? $i['title_ru']  : $i['title_kz'];
    $a = $lang==='ru' ? $i['advice_ru'] : $i['advice_kz'];
    $list[] = ['id'=>$i['id']??'', 'title'=>$t, 'advice'=>$a];
  }
  json_out(['items'=>$list]);
}

if ($action === 'playbook') {
  $id = $body['id'] ?? 'account_hacked';
  if (isset($kb['incident_playbooks'][$id])) {
    $pb = $kb['incident_playbooks'][$id];
    $title = $lang==='ru' ? $pb['title_ru'] : $pb['title_kz'];
    $steps = $lang==='ru' ? $pb['steps_ru'] : $pb['steps_kz'];
    // важно: отдать steps как массив для красивого роадмапа
    json_out(['title'=>$title, 'steps'=>$steps]);
  } else {
    json_out(['title'=>$lang==='ru'?'Плейбук не найден.':'Плейбук табылмады.', 'steps'=>[]]);
  }
}

if ($action === 'chat') {
  $msg = trim($body['message'] ?? '');
  if ($msg==='') json_out(['reply'=>$lang==='ru'?'Пустой запрос.':'Бос сұрау.']);

  if (is_malicious_query($msg)) {
    $safe = $lang==='ru'
      ? "Я не помогаю с атаками или взломом. Могу рассказать, как защититься: включите 2FA, используйте уникальные пароли, проверяйте ссылки."
      : "Мен заңсыз әрекеттерге көмектеспеймін. Қорғаныс жайлы айта аламын: 2FA қосыңыз, бірегей құпиясөз қолданыңыз, сілтемені тексеріңіз.";
    json_out(['reply'=>$safe]);
  }

  $low = mb_strtolower($msg, 'UTF-8');

  // helper: найти ответ из FAQ по intent
  $faq_answer = function(string $intent) use ($kb, $lang): ?string {
    foreach (($kb['faq'] ?? []) as $f) {
      if (($f['intent'] ?? '') === $intent) {
        return $lang==='ru' ? ($f['a_ru'] ?? '') : ($f['a_kz'] ?? '');
      }
    }
    return null;
  };

  // фишинг
  if (str_contains($low,'фишинг') || str_contains($low,'phishing') || str_contains($low,'ссылка')) {
    $ans = $faq_answer('phishing');
    if ($ans) json_out(['reply'=>($lang==='ru'?'Фишинг. ':'Фишинг. ').$ans]);
  }

  // пароли/2fa
  if (preg_match('~парол|password|2fa|құпиясөз|аутентификатор~ui', $low)) {
    $ans = $faq_answer('passwords');
    if ($ans) json_out(['reply'=>($lang==='ru'?'Пароли и 2FA. ':'Құпиясөз бен 2FA. ').$ans]);
  }

  // публичный wi-fi
  if (preg_match('~wi[\-\s]?fi|вайфай|қоғамдық|кафе~ui', $low)) {
    $ans = $faq_answer('public_wifi');
    if ($ans) json_out(['reply'=>($lang==='ru'?'Публичный Wi-Fi. ':'Қоғамдық Wi-Fi. ').$ans]);
  }

  // кибербуллинг
  if (preg_match('~буллинг|bullying|қудалау~ui', $low)) {
    $ans = $faq_answer('cyberbullying');
    if ($ans) json_out(['reply'=>($lang==='ru'?'Кибербуллинг. ':'Кибербуллинг. ').$ans]);
  }

  // фоллбек
  $fallback = $lang==='ru'
    ? "Я не уверен. Выберите тему слева или спросите про фишинг, пароли, Wi-Fi, буллинг. Откройте «Топ-10 угроз» справа."
    : "Нақты емес. Сол жақтан тақырып таңдаңыз немесе фишинг, құпиясөз, Wi-Fi, буллинг жайлы сұраңыз. Оң жақтағы «Топ-10 қауіп» ашыңыз.";
  json_out(['reply'=>$fallback]);
}

json_out(['error'=>'unknown action']);
