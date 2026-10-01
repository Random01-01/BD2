// Teste do front-end ligado à API real (Express + repositório em memória), tudo dentro do processo.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import App from '../src/App.jsx';
import { AuthProvider } from '../src/auth.jsx';
import { hojeSP } from '../src/utils.js';
import { criarApp } from '../../backend/src/app.js';
import { config as base } from '../../backend/src/config.js';
import { proximaData } from '../../backend/src/datas.js';
import { criarRepoMemoria } from '../../backend/src/repos/memoria.js';

let servidor;
const realFetch = globalThis.fetch;

beforeAll(async () => {
  const config = { ...base, jwtSecret: 'segredo-de-teste-bem-longo-123', statusInicial: 'CONFIRMADO', passoMinutos: 30, antecedenciaMinutos: 60 };
  servidor = criarApp(criarRepoMemoria(), config).listen(0);
  const porta = servidor.address().port;
  globalThis.fetch = (url, opts) => realFetch(`http://localhost:${porta}${url}`, opts); // o front usa caminhos relativos
});
afterAll(() => { servidor.close(); globalThis.fetch = realFetch; });
afterEach(() => { cleanup(); sessionStorage.clear(); });

const abrir = (rota = '/') => render(
  <MemoryRouter initialEntries={[rota]}><AuthProvider><App /></AuthProvider></MemoryRouter>,
);

describe('fluxo do cliente', () => {
  it('agenda um serviço do início ao fim e mostra a confirmação', async () => {
    const user = userEvent.setup();
    abrir('/');

    // 1. serviço
    await user.click(await screen.findByLabelText(/Escova/));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    // 2. data e horário (próxima terça; o seed ocupa 10:00-11:00 e 11:30-12:15)
    const terca = proximaData(2, hojeSP(), 2);
    fireEvent.change(await screen.findByLabelText('Data'), { target: { value: terca } });
    const grupo = await screen.findByRole('group', { name: 'Horários disponíveis' });
    expect(within(grupo).queryByLabelText('10:00')).toBeNull();     // ocupado
    await user.click(within(grupo).getByLabelText('14:00'));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    // 3. dados
    await user.type(await screen.findByLabelText('Nome completo'), 'Maria Teste');
    await user.type(screen.getByLabelText('Telefone (WhatsApp)'), '18955551234');
    expect(screen.getByLabelText('Telefone (WhatsApp)')).toHaveValue('(18) 95555-1234'); // máscara
    await user.click(screen.getByRole('button', { name: 'Confirmar agendamento' }));

    expect(await screen.findByRole('heading', { name: /Agendamento confirmado/ })).toBeInTheDocument();
    expect(screen.getByText('14:00 às 14:45')).toBeInTheDocument();
    expect(screen.getByText('R$ 45,00')).toBeInTheDocument();
  });

  it('o horário agendado deixa de aparecer para outro cliente', async () => {
    const user = userEvent.setup();
    abrir('/');
    await user.click(await screen.findByLabelText(/Escova/));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.change(await screen.findByLabelText('Data'), { target: { value: proximaData(2, hojeSP(), 2) } });
    const grupo = await screen.findByRole('group', { name: 'Horários disponíveis' });
    expect(within(grupo).queryByLabelText('14:00')).toBeNull();
    expect(within(grupo).getByLabelText('15:00')).toBeInTheDocument();
  });

  it('dia sem atendimento mostra aviso', async () => {
    const user = userEvent.setup();
    abrir('/');
    await user.click(await screen.findByLabelText(/Escova/));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.change(await screen.findByLabelText('Data'), { target: { value: proximaData(0, hojeSP(), 2) } }); // domingo
    expect(await screen.findByText(/Sem horários neste dia/)).toBeInTheDocument();
  });

  it('cancela pelo número e telefone', async () => {
    const user = userEvent.setup();
    abrir('/cancelar');
    await user.type(await screen.findByLabelText('Nº do agendamento'), '1');
    await user.type(screen.getByLabelText('Telefone'), '18999999999');
    await user.click(screen.getByRole('button', { name: 'Cancelar agendamento' }));
    expect(await screen.findByText(/não encontrado/)).toBeInTheDocument(); // telefone errado
    await user.clear(screen.getByLabelText('Telefone'));
    await user.type(screen.getByLabelText('Telefone'), '18988882222');       // Ana Paula (seed)
    await user.click(screen.getByRole('button', { name: 'Cancelar agendamento' }));
    expect(await screen.findByRole('heading', { name: 'Agendamento cancelado' })).toBeInTheDocument();
  });
});

describe('painel da profissional', () => {
  it('exige login, mostra a agenda e conclui um atendimento', async () => {
    const user = userEvent.setup();
    abrir('/admin');
    expect(await screen.findByRole('heading', { name: 'Área da profissional' })).toBeInTheDocument(); // redirecionou

    await user.type(screen.getByLabelText('E-mail'), 'admin@mariana.com');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/incorretos/)).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Senha'));
    await user.type(screen.getByLabelText('Senha'), 'admin123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('heading', { name: /^Olá, / })).toBeInTheDocument(); // dashboard
    expect(await screen.findByText('Próximos atendimentos')).toBeInTheDocument();

    await user.click(within(screen.getByRole('navigation', { name: 'Painel da profissional' })).getByRole('link', { name: /Agenda/ }));
    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Data'), { target: { value: proximaData(2, hojeSP(), 2) } });
    const juliana = await screen.findByText('Juliana Santos');
    const cartao = juliana.closest('li');
    await user.click(within(cartao).getByRole('button', { name: 'Concluir' }));
    await waitFor(() => expect(within(screen.getByText('Juliana Santos').closest('li')).getByText('Concluído')).toBeInTheDocument());
  });
});

async function entrar(user, rota) {
  abrir(rota);
  if (sessionStorage.length) return; // já logado nesta sessão de teste
  await user.type(await screen.findByLabelText('E-mail'), 'admin@mariana.com');
  await user.type(screen.getByLabelText('Senha'), 'admin123');
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('painel: agenda semanal, serviços e horários', () => {
  it('mostra a semana e abre o dia ao clicar no cabeçalho', async () => {
    const user = userEvent.setup();
    await entrar(user, '/admin/agenda');
    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Semana' }));
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: proximaData(2, hojeSP(), 2) } });
    expect(await screen.findByText('Juliana Santos')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Ter / }));
    expect((await screen.findAllByRole('button', { name: /Confirmar|Concluir|Cancelar/ })).length).toBeGreaterThan(0); // visão do dia
  });

  it('cria, desativa e exclui um serviço, e o site do cliente acompanha', async () => {
    const user = userEvent.setup();
    await entrar(user, '/admin/servicos');
    await user.click(await screen.findByRole('button', { name: '+ Novo serviço' }));
    await user.type(screen.getByLabelText('Nome'), 'Hidratação profunda');
    await user.type(screen.getByLabelText('Preço (R$)'), '85.5');
    await user.clear(screen.getByLabelText('Duração (minutos)'));
    await user.type(screen.getByLabelText('Duração (minutos)'), '45');
    await user.selectOptions(screen.getByLabelText('Categoria'), 'Cabelo');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Serviço criado.')).toBeInTheDocument();
    expect(await screen.findByText('Hidratação profunda')).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Desativar Hidratação profunda' }));
    expect(await screen.findByText('Serviço desativado.')).toBeInTheDocument();
    expect(await screen.findByText('Inativo')).toBeInTheDocument();
    cleanup();

    abrir('/'); // página do cliente não lista o inativo
    expect(await screen.findByLabelText(/Escova/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Hidratação profunda/)).toBeNull();
    cleanup();

    await entrar(user, '/admin/servicos');
    const cartao = (await screen.findByText('Hidratação profunda')).closest('li');
    await user.click(within(cartao).getByRole('button', { name: 'Excluir' }));
    await user.click(within(cartao).getByRole('button', { name: /^Sim/ }));
    expect(await screen.findByText('Serviço excluído.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Hidratação profunda')).toBeNull());
  });

  it('serviço com agendamentos mostra erro ao excluir; categorias duplicadas são recusadas', async () => {
    const user = userEvent.setup();
    await entrar(user, '/admin/servicos');
    const cartao = (await screen.findByText('Corte feminino')).closest('li');
    await user.click(within(cartao).getByRole('button', { name: 'Excluir' }));
    await user.click(within(cartao).getByRole('button', { name: /^Sim/ }));
    expect(await screen.findByText(/Desative-o em vez de excluir/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Categorias' }));
    await user.type(screen.getByLabelText('Nova categoria'), 'cabelo');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText(/Já existe uma categoria/)).toBeInTheDocument();
  });

  it('adiciona e remove horário de atendimento e cadastra folga com aviso de agendamentos', async () => {
    const user = userEvent.setup();
    await entrar(user, '/admin/horarios');
    expect(await screen.findByRole('heading', { name: 'Horários e folgas' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Dia'), 'Domingo');
    await user.click(within(screen.getByRole('form', { name: 'Adicionar horário de atendimento' })).getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText('Horário de atendimento adicionado.')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /Remover 09:00 às 18:00 de Domingo/ }));
    expect(await screen.findByText('Horário removido.')).toBeInTheDocument();

    // sobreposição (segunda já tem 09-18)
    await user.selectOptions(screen.getByLabelText('Dia'), 'Segunda-feira');
    await user.click(within(screen.getByRole('form', { name: 'Adicionar horário de atendimento' })).getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText(/sobrepõe/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('De'), { target: { value: proximaData(2, hojeSP(), 2) } });
    await user.click(within(screen.getByRole('form', { name: 'Adicionar folga' })).getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText(/já existem \d+ agendamento/)).toBeInTheDocument();
  });
});
