const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { iniciarBanco } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta_petshop_2026';
let db;

// Middleware de autenticação
function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ erro: 'Token não fornecido.' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

// Função para gravar log
async function registrarLog(usuario, acao, detalhes) {
  await db.run(
    'INSERT INTO logs (usuario_nome, cargo, acao, detalhes) VALUES (?, ?, ?, ?)',
    [usuario.nome, usuario.cargo, acao, detalhes]
  );
}

// ================= AUTENTICAÇÃO =================

app.post('/register', async (req, res) => {
  const { nome, email, senha, cargo } = req.body;
  try {
    const hash = await bcrypt.hash(senha, 10);
    await db.run(
      'INSERT INTO usuarios (nome, email, senha, cargo) VALUES (?, ?, ?, ?)',
      [nome, email, hash, cargo]
    );
    res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!' });
  } catch {
    res.status(400).json({ erro: 'E-mail já cadastrado ou dados inválidos.' });
  }
});

app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  const user = await db.get('SELECT * FROM usuarios WHERE email = ?', [email]);
  if (!user) return res.status(400).json({ erro: 'E-mail ou senha incorretos.' });

  const valida = await bcrypt.compare(senha, user.senha);
  if (!valida) return res.status(400).json({ erro: 'E-mail ou senha incorretos.' });

  const token = jwt.sign(
    { id: user.id, nome: user.nome, cargo: user.cargo },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  await registrarLog(user, 'LOGIN', `Acessou o sistema (${user.email})`);

  res.json({
    token,
    usuario: { id: user.id, nome: user.nome, email: user.email, cargo: user.cargo },
  });
});

// ================= CRUD DE PETS =================

app.get('/pets', autenticar, async (req, res) => {
  const pets = await db.all('SELECT * FROM pets ORDER BY id DESC');
  res.json(pets);
});

app.post('/pets', autenticar, async (req, res) => {
  const { nome, especie, raca, idade, tutor_nome, tutor_telefone } = req.body;
  const result = await db.run(
    'INSERT INTO pets (nome, especie, raca, idade, tutor_nome, tutor_telefone) VALUES (?, ?, ?, ?, ?, ?)',
    [nome, especie, raca, idade, tutor_nome, tutor_telefone]
  );
  await registrarLog(req.usuario, 'CADASTRO_PET', `Cadastrou o pet ${nome} (${especie}) - Tutor: ${tutor_nome}`);
  res.status(201).json({ id: result.lastID });
});

app.put('/pets/:id', autenticar, async (req, res) => {
  const { nome, especie, raca, idade, tutor_nome, tutor_telefone } = req.body;
  await db.run(
    'UPDATE pets SET nome = ?, especie = ?, raca = ?, idade = ?, tutor_nome = ?, tutor_telefone = ? WHERE id = ?',
    [nome, especie, raca, idade, tutor_nome, tutor_telefone, req.params.id]
  );
  await registrarLog(req.usuario, 'EDICAO_PET', `Editou os dados do pet ${nome} (ID ${req.params.id})`);
  res.json({ mensagem: 'Pet atualizado!' });
});

app.delete('/pets/:id', autenticar, async (req, res) => {
  const pet = await db.get('SELECT nome FROM pets WHERE id = ?', [req.params.id]);
  await db.run('DELETE FROM agendamentos WHERE pet_id = ?', [req.params.id]);
  await db.run('DELETE FROM pets WHERE id = ?', [req.params.id]);
  await registrarLog(req.usuario, 'EXCLUSAO_PET', `Excluiu o pet ${pet?.nome || req.params.id}`);
  res.json({ mensagem: 'Pet excluído!' });
});

// ================= CRUD DE AGENDAMENTOS =================

app.get('/agendamentos', autenticar, async (req, res) => {
  const { data } = req.query;
  let query = `
    SELECT a.*, p.nome AS pet_nome, p.especie, p.tutor_nome
    FROM agendamentos a
    JOIN pets p ON a.pet_id = p.id
  `;
  const params = [];

  if (data) {
    query += ' WHERE a.data_agendamento = ?';
    params.push(data);
  }
  query += ' ORDER BY a.data_agendamento DESC, a.horario ASC';

  const lista = await db.all(query, params);
  res.json(lista);
});

app.post('/agendamentos', autenticar, async (req, res) => {
  const { pet_id, servico, data_agendamento, horario, status } = req.body;
  const pet = await db.get('SELECT nome FROM pets WHERE id = ?', [pet_id]);

  const result = await db.run(
    'INSERT INTO agendamentos (pet_id, servico, data_agendamento, horario, status) VALUES (?, ?, ?, ?, ?)',
    [pet_id, servico, data_agendamento, horario, status]
  );
  await registrarLog(
    req.usuario,
    'NOVO_AGENDAMENTO',
    `Agendou ${servico} para ${pet?.nome || pet_id} em ${data_agendamento} às ${horario}`
  );
  res.status(201).json({ id: result.lastID });
});

app.put('/agendamentos/:id', autenticar, async (req, res) => {
  const { servico, data_agendamento, horario, status } = req.body;
  await db.run(
    'UPDATE agendamentos SET servico = ?, data_agendamento = ?, horario = ?, status = ? WHERE id = ?',
    [servico, data_agendamento, horario, status, req.params.id]
  );
  await registrarLog(
    req.usuario,
    'EDICAO_AGENDAMENTO',
    `Atualizou agendamento ID ${req.params.id} (${servico}) para status: ${status}`
  );
  res.json({ mensagem: 'Agendamento atualizado!' });
});

app.delete('/agendamentos/:id', autenticar, async (req, res) => {
  await db.run('DELETE FROM agendamentos WHERE id = ?', [req.params.id]);
  await registrarLog(req.usuario, 'EXCLUSAO_AGENDAMENTO', `Excluiu agendamento ID ${req.params.id}`);
  res.json({ mensagem: 'Agendamento excluído!' });
});

// ================= LOGS =================

app.get('/logs', autenticar, async (req, res) => {
  const logs = await db.all('SELECT * FROM logs ORDER BY id DESC LIMIT 100');
  res.json(logs);
});

// Inicialização
const PORT = process.env.PORT || 3001;
iniciarBanco().then((database) => {
  db = database;
  app.listen(PORT, () => console.log(`Servidor PetShop rodando na porta ${PORT}`));
}); 