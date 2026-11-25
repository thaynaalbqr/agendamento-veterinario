import { useState, useEffect } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001',
});

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('pet_token') || '');
  const [usuario, setUsuario] = useState(() => {
    const salvo = localStorage.getItem('pet_usuario');
    return salvo ? JSON.parse(salvo) : null;
  });

  // ================= ESTADOS DE LOGIN / CADASTRO =================
  const [modoCadastro, setModoCadastro] = useState(false);
  const [nomeUser, setNomeUser] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [cargo, setCargo] = useState('Recepcionista');

  // ================= NAVEGAÇÃO E AVISOS =================
  const [aba, setAba] = useState('agendamentos');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);

  // ================= DADOS DO BANCO =================
  const [pets, setPets] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [logs, setLogs] = useState([]);

  // ================= FORMULÁRIO E FILTROS DE PETS =================
  const [editandoPetId, setEditandoPetId] = useState(null);
  const [petNome, setPetNome] = useState('');
  const [petEspecie, setPetEspecie] = useState('Cachorro');
  const [petRaca, setPetRaca] = useState('');
  const [petIdade, setPetIdade] = useState('');
  const [tutorNome, setTutorNome] = useState('');
  const [tutorTelefone, setTutorTelefone] = useState('');
  const [buscaPet, setBuscaPet] = useState('');
  const [filtroEspecie, setFiltroEspecie] = useState('Todas');

  // ================= FORMULÁRIO E FILTROS DE AGENDAMENTOS =================
  const hoje = new Date().toISOString().split('T')[0];
  const [editandoAgId, setEditandoAgId] = useState(null);
  const [agPetId, setAgPetId] = useState('');
  const [agServico, setAgServico] = useState('Banho e Tosa');
  const [agData, setAgData] = useState(hoje);
  const [agHorario, setAgHorario] = useState('09:00');
  const [agStatus, setAgStatus] = useState('Agendado');
  const [filtroData, setFiltroData] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');

  // ================= FILTRO DE LOGS =================
  const [buscaLog, setBuscaLog] = useState('');

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` },
  });

  function limparMensagens() {
    setErro('');
    setSucesso('');
  }

  function fazerLogout() {
    localStorage.removeItem('pet_token');
    localStorage.removeItem('pet_usuario');
    setToken('');
    setUsuario(null);
    setPets([]);
    setAgendamentos([]);
    setLogs([]);
    limparMensagens();
  }

  function tratarErro(err) {
    if (err.response?.status === 401) {
      fazerLogout();
      setErro('Sua sessão expirou. Faça login novamente.');
    } else {
      setErro(err.response?.data?.erro || 'Erro ao conectar com o servidor.');
    }
  }

  // ================= AUTENTICAÇÃO =================

  async function handleAuth(e) {
    e.preventDefault();
    limparMensagens();
    setCarregando(true);

    try {
      if (modoCadastro) {
        await api.post('/register', { nome: nomeUser, email, senha, cargo });
        setSucesso('Conta criada com sucesso! Agora faça login com seus dados.');
        setModoCadastro(false);
        setSenha('');
      } else {
        const res = await api.post('/login', { email, senha });
        localStorage.setItem('pet_token', res.data.token);
        localStorage.setItem('pet_usuario', JSON.stringify(res.data.usuario));
        setToken(res.data.token);
        setUsuario(res.data.usuario);
        setEmail('');
        setSenha('');
      }
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro na autenticação.');
    } finally {
      setCarregando(false);
    }
  }

  // ================= CARREGAMENTO DE DADOS =================

  async function carregarPets() {
    try {
      const res = await api.get('/pets', authHeaders());
      setPets(res.data);
    } catch (err) {
      tratarErro(err);
    }
  }

  async function carregarAgendamentos(dataSelecionada = filtroData) {
    try {
      const url = dataSelecionada ? `/agendamentos?data=${dataSelecionada}` : '/agendamentos';
      const res = await api.get(url, authHeaders());
      setAgendamentos(res.data);
    } catch (err) {
      tratarErro(err);
    }
  }

  async function carregarLogs() {
    try {
      const res = await api.get('/logs', authHeaders());
      setLogs(res.data);
    } catch (err) {
      tratarErro(err);
    }
  }

  useEffect(() => {
    if (!token) return;
    carregarPets();
    carregarAgendamentos();
    if (aba === 'logs') carregarLogs();
  }, [token, aba]);

  // ================= CRUD DE PETS =================

  async function salvarPet(e) {
    e.preventDefault();
    limparMensagens();

    const payload = {
      nome: petNome,
      especie: petEspecie,
      raca: petRaca,
      idade: petIdade,
      tutor_nome: tutorNome,
      tutor_telefone: tutorTelefone,
    };

    try {
      if (editandoPetId) {
        await api.put(`/pets/${editandoPetId}`, payload, authHeaders());
        setSucesso('Dados do pet atualizados com sucesso!');
      } else {
        await api.post('/pets', payload, authHeaders());
        setSucesso('Pet cadastrado com sucesso!');
      }
      cancelarEdicaoPet();
      carregarPets();
    } catch (err) {
      tratarErro(err);
    }
  }

  function iniciarEdicaoPet(pet) {
    setEditandoPetId(pet.id);
    setPetNome(pet.nome);
    setPetEspecie(pet.especie);
    setPetRaca(pet.raca);
    setPetIdade(pet.idade);
    setTutorNome(pet.tutor_nome);
    setTutorTelefone(pet.tutor_telefone);
    limparMensagens();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarEdicaoPet() {
    setEditandoPetId(null);
    setPetNome('');
    setPetEspecie('Cachorro');
    setPetRaca('');
    setPetIdade('');
    setTutorNome('');
    setTutorTelefone('');
  }

  async function excluirPet(id) {
    if (!window.confirm('Tem certeza que deseja excluir este pet e seus agendamentos?')) return;
    limparMensagens();
    try {
      await api.delete(`/pets/${id}`, authHeaders());
      setSucesso('Pet excluído com sucesso!');
      carregarPets();
      carregarAgendamentos();
    } catch (err) {
      tratarErro(err);
    }
  }

  // ================= CRUD DE AGENDAMENTOS =================

  async function salvarAgendamento(e) {
    e.preventDefault();
    limparMensagens();

    try {
      if (editandoAgId) {
        await api.put(
          `/agendamentos/${editandoAgId}`,
          {
            servico: agServico,
            data_agendamento: agData,
            horario: agHorario,
            status: agStatus,
          },
          authHeaders()
        );
        setSucesso('Agendamento atualizado com sucesso!');
      } else {
        await api.post(
          '/agendamentos',
          {
            pet_id: Number(agPetId),
            servico: agServico,
            data_agendamento: agData,
            horario: agHorario,
            status: agStatus,
          },
          authHeaders()
        );
        setSucesso('Agendamento registrado com sucesso!');
      }
      cancelarEdicaoAg();
      carregarAgendamentos();
    } catch (err) {
      tratarErro(err);
    }
  }

  function iniciarEdicaoAg(item) {
    setEditandoAgId(item.id);
    setAgPetId(String(item.pet_id));
    setAgServico(item.servico);
    setAgData(item.data_agendamento);
    setAgHorario(item.horario);
    setAgStatus(item.status);
    limparMensagens();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarEdicaoAg() {
    setEditandoAgId(null);
    setAgPetId('');
    setAgServico('Banho e Tosa');
    setAgData(hoje);
    setAgHorario('09:00');
    setAgStatus('Agendado');
  }

  async function excluirAgendamento(id) {
    if (!window.confirm('Deseja apagar este agendamento?')) return;
    limparMensagens();
    try {
      await api.delete(`/agendamentos/${id}`, authHeaders());
      setSucesso('Agendamento apagado com sucesso!');
      carregarAgendamentos();
    } catch (err) {
      tratarErro(err);
    }
  }

  // ================= FUNÇÕES AUXILIARES =================

  function formatarDataHora(texto) {
    if (!texto) return '';
    return new Date(texto.replace(' ', 'T') + 'Z').toLocaleString('pt-BR');
  }

  function formatarDataBR(iso) {
    if (!iso) return '';
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  function obterIniciais(nome) {
    if (!nome) return 'PC';
    const partes = nome.trim().split(' ');
    if (partes.length === 1) return partes[0][0].toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  function iconeEspecie(especie) {
    if (especie === 'Cachorro') return '🐶';
    if (especie === 'Gato') return '🐱';
    if (especie === 'Coelho') return '🐰';
    if (especie === 'Hamster') return '🐹';
    if (especie === 'Ave / Pássaro') return '🦜';
    if (especie === 'Tartaruga / Réptil') return '🐢';
    return '🐾';
  }

  function classeStatus(status) {
    if (status === 'Finalizado') return 'badge-verde';
    if (status === 'Em atendimento') return 'badge-alerta';
    if (status === 'Cancelado') return 'badge-cinza';
    return 'badge-rosa';
  }

  // ================= ESTATÍSTICAS E FILTROS =================

  const totalAgendados = agendamentos.filter((a) => a.status === 'Agendado').length;
  const totalEmAtendimento = agendamentos.filter((a) => a.status === 'Em atendimento').length;
  const totalFinalizados = agendamentos.filter((a) => a.status === 'Finalizado').length;

  const petsFiltrados = pets.filter((p) => {
    const bateBusca =
      p.nome.toLowerCase().includes(buscaPet.toLowerCase()) ||
      p.tutor_nome.toLowerCase().includes(buscaPet.toLowerCase()) ||
      p.raca.toLowerCase().includes(buscaPet.toLowerCase()) ||
      p.tutor_telefone.toLowerCase().includes(buscaPet.toLowerCase());

    const bateEspecie = filtroEspecie === 'Todas' || p.especie === filtroEspecie;
    return bateBusca && bateEspecie;
  });

  const agendamentosFiltrados = agendamentos.filter((a) => {
    return filtroStatus === 'Todos' || a.status === filtroStatus;
  });

  const logsFiltrados = logs.filter(
    (log) =>
      log.usuario_nome.toLowerCase().includes(buscaLog.toLowerCase()) ||
      log.acao.toLowerCase().includes(buscaLog.toLowerCase()) ||
      log.detalhes.toLowerCase().includes(buscaLog.toLowerCase())
  );

  // ================= TELA DE LOGIN / CADASTRO (SPLIT SCREEN) =================

  if (!token) {
    return (
      <div className="auth-split">
        <div className="auth-banner">
          <div className="banner-content">
            <span className="banner-pill">🐾 Gestão Pet & Clínica</span>
            <h1>PetCare Clínica & Shop</h1>
            <p className="banner-desc">
              Sistema completo para gerenciar cadastros de pets, tutores, agenda de banhos, tosas, consultas veterinárias e auditoria da equipe.
            </p>

            <div className="banner-cards">
              <div className="mini-feature">
                <span>🐶</span>
                <div>
                  <strong>Pets e Tutores</strong>
                  <small>Cadastro diversificado por espécie, raça e contato</small>
                </div>
              </div>
              <div className="mini-feature">
                <span>📅</span>
                <div>
                  <strong>Agenda Inteligente</strong>
                  <small>Controle de horários, serviços e status em tempo real</small>
                </div>
              </div>
              <div className="mini-feature">
                <span>🛡️</span>
                <div>
                  <strong>Histórico (Logs)</strong>
                  <small>Registro automático de cada ação feita pela equipe</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-form-side">
          <div className="auth-box">
            <div className="auth-switch">
              <button
                type="button"
                className={!modoCadastro ? 'ativo' : ''}
                onClick={() => { setModoCadastro(false); limparMensagens(); }}
              >
                Entrar
              </button>
              <button
                type="button"
                className={modoCadastro ? 'ativo' : ''}
                onClick={() => { setModoCadastro(true); limparMensagens(); }}
              >
                Criar Conta
              </button>
            </div>

            <h2>{modoCadastro ? 'Cadastro de Funcionário' : 'Acesse sua conta'}</h2>
            <p className="subtitulo-left">
              {modoCadastro
                ? 'Preencha os campos abaixo para entrar na equipe PetCare.'
                : 'Informe suas credenciais para abrir o painel de controle.'}
            </p>

            {erro && <div className="alerta alerta-erro">{erro}</div>}
            {sucesso && <div className="alerta alerta-sucesso">{sucesso}</div>}

            <form onSubmit={handleAuth}>
              {modoCadastro && (
                <>
                  <div className="form-group">
                    <label>Nome completo</label>
                    <input
                      type="text"
                      value={nomeUser}
                      onChange={(e) => setNomeUser(e.target.value)}
                      placeholder="Ex: Maria Clara"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Cargo / Função</label>
                    <select value={cargo} onChange={(e) => setCargo(e.target.value)}>
                      <option value="Recepcionista">Recepcionista</option>
                      <option value="Veterinário(a)">Veterinário(a)</option>
                      <option value="Tosador(a)">Tosador(a)</option>
                      <option value="Auxiliar de Clínica">Auxiliar de Clínica</option>
                      <option value="Gerente">Gerente</option>
                    </select>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@petcare.com"
                  required
                />
              </div>

              <div className="form-group">
                <label>Senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" className="btn-primary btn-lg" disabled={carregando}>
                {carregando
                  ? 'Aguarde...'
                  : modoCadastro
                  ? 'Finalizar Cadastro'
                  : 'Entrar no Painel'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ================= PAINEL PRINCIPAL COM MENU LATERAL =================

  return (
    <div className="dashboard-layout">
      {/* MENU LATERAL (SIDEBAR) */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">🐾</div>
          <div>
            <h2>PetCare</h2>
            <small>Clínica & Shop</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${aba === 'agendamentos' ? 'ativo' : ''}`}
            onClick={() => { setAba('agendamentos'); limparMensagens(); }}
          >
            <span>📅</span> Agendamentos
            <span className="nav-count">{agendamentos.length}</span>
          </button>

          <button
            className={`nav-item ${aba === 'pets' ? 'ativo' : ''}`}
            onClick={() => { setAba('pets'); limparMensagens(); }}
          >
            <span>🐶</span> Pets e Tutores
            <span className="nav-count">{pets.length}</span>
          </button>

          <button
            className={`nav-item ${aba === 'logs' ? 'ativo' : ''}`}
            onClick={() => { setAba('logs'); limparMensagens(); }}
          >
            <span>🛡️</span> Histórico (Logs)
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="avatar">{obterIniciais(usuario?.nome)}</div>
            <div className="user-details">
              <strong>{usuario?.nome}</strong>
              <span>{usuario?.cargo}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={fazerLogout} style={{ width: '100%' }}>
            Sair da conta
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>
              {aba === 'agendamentos' && 'Agenda de Atendimentos'}
              {aba === 'pets' && 'Cadastro de Pets e Tutores'}
              {aba === 'logs' && 'Histórico de Auditoria (Logs)'}
            </h1>
            <p>
              {aba === 'agendamentos' && 'Marque banhos, tosas, consultas e acompanhe o status de cada pet.'}
              {aba === 'pets' && 'Gerencie todos os animais cadastrados e os contatos dos tutores.'}
              {aba === 'logs' && 'Veja todas as ações realizadas pelos funcionários no sistema.'}
            </p>
          </div>
        </div>

        {/* CARTÕES DE ESTATÍSTICAS */}
        <section className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total de Pets</span>
            <span className="stat-value rosa">{pets.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Agendados</span>
            <span className="stat-value">{totalAgendados}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Em Atendimento</span>
            <span className="stat-value rosa">{totalEmAtendimento}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Finalizados</span>
            <span className="stat-value verde">{totalFinalizados}</span>
          </div>
        </section>

        {erro && <div className="alerta alerta-erro">{erro}</div>}
        {sucesso && <div className="alerta alerta-sucesso">{sucesso}</div>}

        {/* ================= ABA 1: AGENDAMENTOS ================= */}
        {aba === 'agendamentos' && (
          <>
            <div className="card">
              <div className="card-header">
                <h3>{editandoAgId ? '✏️ Editar Agendamento' : '➕ Novo Agendamento'}</h3>
              </div>

              <form className="form-grid" onSubmit={salvarAgendamento}>
                <div className="form-group">
                  <label>Pet</label>
                  <select
                    value={agPetId}
                    onChange={(e) => setAgPetId(e.target.value)}
                    disabled={!!editandoAgId}
                    required
                  >
                    <option value="">Selecione um pet...</option>
                    {pets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {iconeEspecie(p.especie)} {p.nome} — Tutor: {p.tutor_nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Serviço</label>
                  <select value={agServico} onChange={(e) => setAgServico(e.target.value)}>
                    <option value="Banho e Tosa">Banho e Tosa</option>
                    <option value="Banho Simples">Banho Simples</option>
                    <option value="Tosa Higiênica">Tosa Higiênica</option>
                    <option value="Hidratação de Pelos">Hidratação de Pelos</option>
                    <option value="Corte de Unhas">Corte de Unhas</option>
                    <option value="Consulta Veterinária">Consulta Veterinária</option>
                    <option value="Vacinação">Vacinação</option>
                    <option value="Exame de Rotina">Exame de Rotina</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Data</label>
                  <input
                    type="date"
                    value={agData}
                    onChange={(e) => setAgData(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Horário</label>
                  <input
                    type="time"
                    value={agHorario}
                    onChange={(e) => setAgHorario(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select value={agStatus} onChange={(e) => setAgStatus(e.target.value)}>
                    <option value="Agendado">Agendado</option>
                    <option value="Em atendimento">Em atendimento</option>
                    <option value="Finalizado">Finalizado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                    {editandoAgId ? 'Salvar alteração' : 'Agendar'}
                  </button>
                  {editandoAgId && (
                    <button type="button" className="btn-secondary" onClick={cancelarEdicaoAg}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>Lista de Agendamentos ({agendamentosFiltrados.length})</h3>
                <div className="filtro-row">
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                  >
                    <option value="Todos">Todos os status</option>
                    <option value="Agendado">Agendado</option>
                    <option value="Em atendimento">Em atendimento</option>
                    <option value="Finalizado">Finalizado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>

                  <input
                    type="date"
                    value={filtroData}
                    onChange={(e) => {
                      setFiltroData(e.target.value);
                      carregarAgendamentos(e.target.value);
                    }}
                  />

                  {(filtroData || filtroStatus !== 'Todos') && (
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => {
                        setFiltroData('');
                        setFiltroStatus('Todos');
                        carregarAgendamentos('');
                      }}
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Data / Hora</th>
                      <th>Pet e Tutor</th>
                      <th>Serviço</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agendamentosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty-state">
                          Nenhum agendamento encontrado com os filtros atuais.
                        </td>
                      </tr>
                    ) : (
                      agendamentosFiltrados.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <strong>{formatarDataBR(a.data_agendamento)}</strong>
                            <div className="sub-cell">às {a.horario}</div>
                          </td>
                          <td>
                            <strong>{iconeEspecie(a.especie)} {a.pet_nome}</strong>
                            <div className="sub-cell">Tutor: {a.tutor_nome}</div>
                          </td>
                          <td>{a.servico}</td>
                          <td>
                            <span className={`badge ${classeStatus(a.status)}`}>
                              {a.status}
                            </span>
                          </td>
                          <td>
                            <div className="acoes-cell">
                              <button className="btn-edit btn-sm" onClick={() => iniciarEdicaoAg(a)}>
                                Editar
                              </button>
                              <button className="btn-delete btn-sm" onClick={() => excluirAgendamento(a.id)}>
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ================= ABA 2: PETS E TUTORES ================= */}
        {aba === 'pets' && (
          <>
            <div className="card">
              <div className="card-header">
                <h3>{editandoPetId ? '✏️ Editar Pet' : '➕ Cadastrar Novo Pet'}</h3>
              </div>

              <form className="form-grid" onSubmit={salvarPet}>
                <div className="form-group">
                  <label>Nome do Pet</label>
                  <input
                    type="text"
                    value={petNome}
                    onChange={(e) => setPetNome(e.target.value)}
                    placeholder="Ex: Mel"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Espécie</label>
                  <select value={petEspecie} onChange={(e) => setPetEspecie(e.target.value)}>
                    <option value="Cachorro">Cachorro</option>
                    <option value="Gato">Gato</option>
                    <option value="Coelho">Coelho</option>
                    <option value="Hamster">Hamster</option>
                    <option value="Ave / Pássaro">Ave / Pássaro</option>
                    <option value="Tartaruga / Réptil">Tartaruga / Réptil</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Raça</label>
                  <input
                    type="text"
                    value={petRaca}
                    onChange={(e) => setPetRaca(e.target.value)}
                    placeholder="Ex: Shih-tzu / SRD"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Idade</label>
                  <input
                    type="text"
                    value={petIdade}
                    onChange={(e) => setPetIdade(e.target.value)}
                    placeholder="Ex: 2 anos"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Nome do Tutor</label>
                  <input
                    type="text"
                    value={tutorNome}
                    onChange={(e) => setTutorNome(e.target.value)}
                    placeholder="Ex: Ana Paula"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Telefone do Tutor</label>
                  <input
                    type="text"
                    value={tutorTelefone}
                    onChange={(e) => setTutorTelefone(e.target.value)}
                    placeholder="(81) 99999-9999"
                    required
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                    {editandoPetId ? 'Salvar Pet' : 'Cadastrar Pet'}
                  </button>
                  {editandoPetId && (
                    <button type="button" className="btn-secondary" onClick={cancelarEdicaoPet}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>Pets Cadastrados ({petsFiltrados.length})</h3>
                <div className="filtro-row">
                  <select
                    value={filtroEspecie}
                    onChange={(e) => setFiltroEspecie(e.target.value)}
                  >
                    <option value="Todas">Todas as espécies</option>
                    <option value="Cachorro">Cachorro</option>
                    <option value="Gato">Gato</option>
                    <option value="Coelho">Coelho</option>
                    <option value="Hamster">Hamster</option>
                    <option value="Ave / Pássaro">Ave / Pássaro</option>
                    <option value="Tartaruga / Réptil">Tartaruga / Réptil</option>
                    <option value="Outro">Outro</option>
                  </select>

                  <input
                    type="text"
                    value={buscaPet}
                    onChange={(e) => setBuscaPet(e.target.value)}
                    placeholder="Buscar por pet, raça ou tutor..."
                    style={{ minWidth: '230px' }}
                  />
                </div>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Pet</th>
                      <th>Espécie e Raça</th>
                      <th>Idade</th>
                      <th>Tutor e Contato</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {petsFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty-state">
                          Nenhum pet encontrado.
                        </td>
                      </tr>
                    ) : (
                      petsFiltrados.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong>{iconeEspecie(p.especie)} {p.nome}</strong>
                          </td>
                          <td>
                            <span className="badge badge-rosa">{p.especie}</span>
                            <div className="sub-cell">{p.raca}</div>
                          </td>
                          <td>{p.idade}</td>
                          <td>
                            <strong>{p.tutor_nome}</strong>
                            <div className="sub-cell">{p.tutor_telefone}</div>
                          </td>
                          <td>
                            <div className="acoes-cell">
                              <button className="btn-edit btn-sm" onClick={() => iniciarEdicaoPet(p)}>
                                Editar
                              </button>
                              <button className="btn-delete btn-sm" onClick={() => excluirPet(p.id)}>
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ================= ABA 3: LOGS ================= */}
        {aba === 'logs' && (
          <div className="card">
            <div className="card-header">
              <h3>Registros de Atividade ({logsFiltrados.length})</h3>
              <div className="filtro-row">
                <input
                  type="text"
                  value={buscaLog}
                  onChange={(e) => setBuscaLog(e.target.value)}
                  placeholder="Filtrar por usuário, ação ou detalhe..."
                  style={{ minWidth: '240px' }}
                />
                <button className="btn-secondary btn-sm" onClick={carregarLogs}>
                  Atualizar
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Data e Hora</th>
                    <th>Funcionário</th>
                    <th>Ação</th>
                    <th>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {logsFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="empty-state">
                        Nenhum log registrado.
                      </td>
                    </tr>
                  ) : (
                    logsFiltrados.map((log) => (
                      <tr key={log.id}>
                        <td>{formatarDataHora(log.data_hora)}</td>
                        <td>
                          <strong>{log.usuario_nome}</strong>
                          <div className="sub-cell">{log.cargo}</div>
                        </td>
                        <td>
                          <span className="badge badge-verde">{log.acao}</span>
                        </td>
                        <td>{log.detalhes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}