/**
 * @fileoverview Questões da prova e duração
 */

export interface ITrueFalseItem {
    id: string;
    label: string;
    text: string;
}

export interface ISubQuestion {
    id: string;
    label: string;
    text: string;
}

export interface IQuestion {
    id: string;
    title: string;
    prompt: string;
    type: 'essay' | 'true-false' | 'scenario' | 'multi-essay';
    items?: ITrueFalseItem[];
    subQuestions?: ISubQuestion[];
}

export const EXAM_QUESTIONS: IQuestion[] = [
    {
        id: 'SCENARIO',
        title: 'Cenário',
        type: 'scenario',
        prompt: `• Credora: Aurora Serviços Digitais Ltda.
• Devedor: Carlos Eduardo Ribeiro, homem, 55 anos, servidor público, recebe salário em conta bancária.
• Dívida original: R$ 12.000,00
• Parcelamento: 10x de R$ 1.200,00
• Pagou: 2 parcelas (R$ 2.400,00)
• Inadimplente há: 6 meses
• Saldo principal: R$ 9.600,00
• Há Contrato de Confissão de Dívida com 2 testemunhas (título executivo extrajudicial – CPC 784, III)
• Há Nota Promissória vinculada ao contrato.

O contrato prevê:
• Vencimento antecipado / exigibilidade imediata.
• Encargos: CDI + juros moratórios 2% a.m.
• Penalidade: multa 10% sobre parcela em atraso.
• Taxa administrativa: R$ 80,00 por cobrança realizada.
• Cláusula de autorização para penhora de salário até 30% (com ressalva de mínimo existencial).`,
    },
    {
        id: 'Q2',
        title: 'Com base no cenário acima, responda',
        type: 'multi-essay',
        prompt: ``,
        subQuestions: [
            {
                id: 'A',
                label: 'A',
                text: 'Qual caminho você escolheria para iniciar (ex.: execução/monitória/cobrança; juizado/vara) e por quê?',
            },
            {
                id: 'B',
                label: 'B',
                text: 'Plano em 3 fases (Semana 1 / 30 dias / 60 dias): o que você faria em cada fase?',
            },
            {
                id: 'C',
                label: 'C',
                text: 'Quais medidas e diligências você priorizaria para localizar e constranger patrimônio (ordem e justificativa)?',
            },
            {
                id: 'D',
                label: 'D',
                text: 'Como você trataria a questão de salário/conta-salário, considerando efetividade e limites legais?',
            },
            {
                id: 'E',
                label: 'E',
                text: 'Quais encargos contratuais você aplicaria no cálculo inicial e quais pontos você já antecipa que podem ser discutidos/reduzidos em juízo?',
            },
            {
                id: 'F',
                label: 'F',
                text: 'Qual seu plano se não localizar bens ou valores no primeiro ciclo?',
            },
        ],
    },
    {
        id: 'Q3',
        title: 'Peça prática',
        type: 'essay',
        prompt: `Elabore a sua maneira a primeira petição que você apresentaria ao Judiciário para iniciar a cobrança do caso acima, com a estrutura e os pedidos que entender adequados.`,
    },
];

// Duração da prova: 1 hora
export const EXAM_DURATION_MS = 60 * 60 * 1000;
export const EXAM_DURATION_SECONDS = 60 * 60;
export const EXAM_VERSION = 'v1';
