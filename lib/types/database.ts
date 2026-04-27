export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          atualizadoEm: string
          ciclo: number
          confirmacoesEnviadas: string[] | null
          contatoId: string
          criadoEm: string
          dataHora: string
          duracao: number
          googleEventId: string | null
          googleEventUrl: string | null
          id: string
          observacao: string | null
          procedimentoId: string | null
          sincronizado: boolean
          status: Database["public"]["Enums"]["StatusAgendamento"]
          tipo: Database["public"]["Enums"]["TipoAgendamento"]
        }
        Insert: {
          atualizadoEm: string
          ciclo?: number
          confirmacoesEnviadas?: string[] | null
          contatoId: string
          criadoEm?: string
          dataHora: string
          duracao?: number
          googleEventId?: string | null
          googleEventUrl?: string | null
          id: string
          observacao?: string | null
          procedimentoId?: string | null
          sincronizado?: boolean
          status?: Database["public"]["Enums"]["StatusAgendamento"]
          tipo?: Database["public"]["Enums"]["TipoAgendamento"]
        }
        Update: {
          atualizadoEm?: string
          ciclo?: number
          confirmacoesEnviadas?: string[] | null
          contatoId?: string
          criadoEm?: string
          dataHora?: string
          duracao?: number
          googleEventId?: string | null
          googleEventUrl?: string | null
          id?: string
          observacao?: string | null
          procedimentoId?: string | null
          sincronizado?: boolean
          status?: Database["public"]["Enums"]["StatusAgendamento"]
          tipo?: Database["public"]["Enums"]["TipoAgendamento"]
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_contatoId_fkey"
            columns: ["contatoId"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_procedimentoId_fkey"
            columns: ["procedimentoId"]
            isOneToOne: false
            referencedRelation: "procedimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      analista_logs: {
        Row: {
          aplicado: boolean
          confiancaGeral: number | null
          contatoId: string
          conversaId: string | null
          criadoEm: string
          divergencias: Json
          erro: string | null
          estadoAtualContato: Json | null
          historicoMensagens: Json
          id: string
          output: Json | null
        }
        Insert: {
          aplicado?: boolean
          confiancaGeral?: number | null
          contatoId: string
          conversaId?: string | null
          criadoEm?: string
          divergencias?: Json
          erro?: string | null
          estadoAtualContato?: Json | null
          historicoMensagens?: Json
          id: string
          output?: Json | null
        }
        Update: {
          aplicado?: boolean
          confiancaGeral?: number | null
          contatoId?: string
          conversaId?: string | null
          criadoEm?: string
          divergencias?: Json
          erro?: string | null
          estadoAtualContato?: Json | null
          historicoMensagens?: Json
          id?: string
          output?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "analista_logs_contatoId_fkey"
            columns: ["contatoId"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analista_logs_conversaId_fkey"
            columns: ["conversaId"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      anamneses: {
        Row: {
          alergias: string | null
          alturaCm: number | null
          anticoncepcional: string | null
          atividadeFisica: string | null
          atualizadoEm: string
          cirurgiasAnteriores: string | null
          criadoEm: string
          doencasPreExistentes: string | null
          etilismo: boolean | null
          gestacoes: string | null
          historicoMedico: string | null
          id: string
          imc: number | null
          medicamentosEmUso: string | null
          observacoes: string | null
          pesoKg: number | null
          pressaoArterial: string | null
          prontuarioId: string
          queixaPrincipal: string | null
          tabagismo: boolean | null
        }
        Insert: {
          alergias?: string | null
          alturaCm?: number | null
          anticoncepcional?: string | null
          atividadeFisica?: string | null
          atualizadoEm: string
          cirurgiasAnteriores?: string | null
          criadoEm?: string
          doencasPreExistentes?: string | null
          etilismo?: boolean | null
          gestacoes?: string | null
          historicoMedico?: string | null
          id: string
          imc?: number | null
          medicamentosEmUso?: string | null
          observacoes?: string | null
          pesoKg?: number | null
          pressaoArterial?: string | null
          prontuarioId: string
          queixaPrincipal?: string | null
          tabagismo?: boolean | null
        }
        Update: {
          alergias?: string | null
          alturaCm?: number | null
          anticoncepcional?: string | null
          atividadeFisica?: string | null
          atualizadoEm?: string
          cirurgiasAnteriores?: string | null
          criadoEm?: string
          doencasPreExistentes?: string | null
          etilismo?: boolean | null
          gestacoes?: string | null
          historicoMedico?: string | null
          id?: string
          imc?: number | null
          medicamentosEmUso?: string | null
          observacoes?: string | null
          pesoKg?: number | null
          pressaoArterial?: string | null
          prontuarioId?: string
          queixaPrincipal?: string | null
          tabagismo?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "anamneses_prontuarioId_fkey"
            columns: ["prontuarioId"]
            isOneToOne: false
            referencedRelation: "prontuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          acao: string
          criadoEm: string
          dadosAntes: Json | null
          dadosDepois: Json | null
          entidade: string
          entidadeId: string | null
          id: string
          ip: string | null
          usuarioId: string | null
        }
        Insert: {
          acao: string
          criadoEm?: string
          dadosAntes?: Json | null
          dadosDepois?: Json | null
          entidade: string
          entidadeId?: string | null
          id: string
          ip?: string | null
          usuarioId?: string | null
        }
        Update: {
          acao?: string
          criadoEm?: string
          dadosAntes?: Json | null
          dadosDepois?: Json | null
          entidade?: string
          entidadeId?: string | null
          id?: string
          ip?: string | null
          usuarioId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_usuarioId_fkey"
            columns: ["usuarioId"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      base_conhecimento: {
        Row: {
          atualizadoEm: string
          conteudo: string
          criadoEm: string
          deletadoEm: string | null
          id: string
          titulo: string
        }
        Insert: {
          atualizadoEm: string
          conteudo: string
          criadoEm?: string
          deletadoEm?: string | null
          id: string
          titulo: string
        }
        Update: {
          atualizadoEm?: string
          conteudo?: string
          criadoEm?: string
          deletadoEm?: string | null
          id?: string
          titulo?: string
        }
        Relationships: []
      }
      config_google_calendar: {
        Row: {
          ativo: boolean
          atualizadoEm: string
          calendarId: string | null
          clientId: string
          clientSecret: string
          criadoEm: string
          id: string
          refreshToken: string | null
        }
        Insert: {
          ativo?: boolean
          atualizadoEm: string
          calendarId?: string | null
          clientId: string
          clientSecret: string
          criadoEm?: string
          id: string
          refreshToken?: string | null
        }
        Update: {
          ativo?: boolean
          atualizadoEm?: string
          calendarId?: string | null
          clientId?: string
          clientSecret?: string
          criadoEm?: string
          id?: string
          refreshToken?: string | null
        }
        Relationships: []
      }
      config_site: {
        Row: {
          ativo: boolean
          atualizadoEm: string
          contatoCidade: string | null
          contatoEndereco: string | null
          contatoTelefone: string | null
          criadoEm: string
          id: string
          instagramUrl: string | null
          medicoCrm: string | null
          medicoEspecialidade: string | null
          medicoNome: string | null
          whatsappMensagem: string | null
          whatsappNumero: string | null
        }
        Insert: {
          ativo?: boolean
          atualizadoEm: string
          contatoCidade?: string | null
          contatoEndereco?: string | null
          contatoTelefone?: string | null
          criadoEm?: string
          id: string
          instagramUrl?: string | null
          medicoCrm?: string | null
          medicoEspecialidade?: string | null
          medicoNome?: string | null
          whatsappMensagem?: string | null
          whatsappNumero?: string | null
        }
        Update: {
          ativo?: boolean
          atualizadoEm?: string
          contatoCidade?: string | null
          contatoEndereco?: string | null
          contatoTelefone?: string | null
          criadoEm?: string
          id?: string
          instagramUrl?: string | null
          medicoCrm?: string | null
          medicoEspecialidade?: string | null
          medicoNome?: string | null
          whatsappMensagem?: string | null
          whatsappNumero?: string | null
        }
        Relationships: []
      }
      config_whatsapp: {
        Row: {
          adminToken: string
          ativo: boolean
          atualizadoEm: string
          criadoEm: string
          id: string
          instanceId: string | null
          instanceToken: string | null
          nome: string | null
          numeroWhatsapp: string | null
          uazapiUrl: string
          webhookUrl: string | null
        }
        Insert: {
          adminToken: string
          ativo?: boolean
          atualizadoEm: string
          criadoEm?: string
          id: string
          instanceId?: string | null
          instanceToken?: string | null
          nome?: string | null
          numeroWhatsapp?: string | null
          uazapiUrl: string
          webhookUrl?: string | null
        }
        Update: {
          adminToken?: string
          ativo?: boolean
          atualizadoEm?: string
          criadoEm?: string
          id?: string
          instanceId?: string | null
          instanceToken?: string | null
          nome?: string | null
          numeroWhatsapp?: string | null
          uazapiUrl?: string
          webhookUrl?: string | null
        }
        Relationships: []
      }
      contatos: {
        Row: {
          arquivado: boolean
          arquivadoEm: string | null
          atualizadoEm: string
          cicloAtual: number
          ciclosCompletos: number
          cidade: string | null
          consentimentoLgpd: boolean
          consentimentoLgpdEm: string | null
          contatoEmergencia: string | null
          contatoEmergenciaTel: string | null
          cpf: string | null
          criadoEm: string
          dataNascimento: string | null
          deletadoEm: string | null
          ehRetorno: boolean
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          origem: string | null
          procedimentoInteresse: string | null
          promovidoEm: string | null
          responsavelId: string | null
          sexo: string | null
          sobreOPaciente: string | null
          statusFunil: Database["public"]["Enums"]["StatusFunil"] | null
          tipo: Database["public"]["Enums"]["TipoContato"]
          ultimaMovimentacaoEm: string | null
          whatsapp: string | null
        }
        Insert: {
          arquivado?: boolean
          arquivadoEm?: string | null
          atualizadoEm?: string
          cicloAtual?: number
          ciclosCompletos?: number
          cidade?: string | null
          consentimentoLgpd?: boolean
          consentimentoLgpdEm?: string | null
          contatoEmergencia?: string | null
          contatoEmergenciaTel?: string | null
          cpf?: string | null
          criadoEm?: string
          dataNascimento?: string | null
          deletadoEm?: string | null
          ehRetorno?: boolean
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id: string
          nome: string
          origem?: string | null
          procedimentoInteresse?: string | null
          promovidoEm?: string | null
          responsavelId?: string | null
          sexo?: string | null
          sobreOPaciente?: string | null
          statusFunil?: Database["public"]["Enums"]["StatusFunil"] | null
          tipo?: Database["public"]["Enums"]["TipoContato"]
          ultimaMovimentacaoEm?: string | null
          whatsapp?: string | null
        }
        Update: {
          arquivado?: boolean
          arquivadoEm?: string | null
          atualizadoEm?: string
          cicloAtual?: number
          ciclosCompletos?: number
          cidade?: string | null
          consentimentoLgpd?: boolean
          consentimentoLgpdEm?: string | null
          contatoEmergencia?: string | null
          contatoEmergenciaTel?: string | null
          cpf?: string | null
          criadoEm?: string
          dataNascimento?: string | null
          deletadoEm?: string | null
          ehRetorno?: boolean
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          origem?: string | null
          procedimentoInteresse?: string | null
          promovidoEm?: string | null
          responsavelId?: string | null
          sexo?: string | null
          sobreOPaciente?: string | null
          statusFunil?: Database["public"]["Enums"]["StatusFunil"] | null
          tipo?: Database["public"]["Enums"]["TipoContato"]
          ultimaMovimentacaoEm?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_responsavelId_fkey"
            columns: ["responsavelId"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      conversas: {
        Row: {
          atendenteId: string | null
          atualizadoEm: string
          ciclo: number
          contatoId: string
          criadoEm: string
          encerradaEm: string | null
          etapa: Database["public"]["Enums"]["EtapaConversa"]
          followUpEnviados: string[] | null
          id: string
          modoConversa: Database["public"]["Enums"]["ModoConversa"]
          ultimaMensagemEm: string | null
        }
        Insert: {
          atendenteId?: string | null
          atualizadoEm: string
          ciclo?: number
          contatoId: string
          criadoEm?: string
          encerradaEm?: string | null
          etapa?: Database["public"]["Enums"]["EtapaConversa"]
          followUpEnviados?: string[] | null
          id: string
          modoConversa?: Database["public"]["Enums"]["ModoConversa"]
          ultimaMensagemEm?: string | null
        }
        Update: {
          atendenteId?: string | null
          atualizadoEm?: string
          ciclo?: number
          contatoId?: string
          criadoEm?: string
          encerradaEm?: string | null
          etapa?: Database["public"]["Enums"]["EtapaConversa"]
          followUpEnviados?: string[] | null
          id?: string
          modoConversa?: Database["public"]["Enums"]["ModoConversa"]
          ultimaMensagemEm?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversas_atendenteId_fkey"
            columns: ["atendenteId"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_contatoId_fkey"
            columns: ["contatoId"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_prontuario: {
        Row: {
          criadoEm: string
          descricao: string | null
          id: string
          mimeType: string | null
          nome: string
          prontuarioId: string
          storagePath: string
          tamanhoBytes: number | null
          tipo: Database["public"]["Enums"]["TipoDocumentoProntuario"]
        }
        Insert: {
          criadoEm?: string
          descricao?: string | null
          id: string
          mimeType?: string | null
          nome: string
          prontuarioId: string
          storagePath: string
          tamanhoBytes?: number | null
          tipo: Database["public"]["Enums"]["TipoDocumentoProntuario"]
        }
        Update: {
          criadoEm?: string
          descricao?: string | null
          id?: string
          mimeType?: string | null
          nome?: string
          prontuarioId?: string
          storagePath?: string
          tamanhoBytes?: number | null
          tipo?: Database["public"]["Enums"]["TipoDocumentoProntuario"]
        }
        Relationships: [
          {
            foreignKeyName: "documentos_prontuario_prontuarioId_fkey"
            columns: ["prontuarioId"]
            isOneToOne: false
            referencedRelation: "prontuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      evolucoes: {
        Row: {
          atualizadoEm: string
          conteudo: string
          criadoEm: string
          dataRegistro: string
          deletadoEm: string | null
          id: string
          orientacoes: string | null
          prescricao: string | null
          procedimentoId: string | null
          prontuarioId: string
          tipo: Database["public"]["Enums"]["TipoEvolucao"]
          titulo: string
        }
        Insert: {
          atualizadoEm: string
          conteudo: string
          criadoEm?: string
          dataRegistro?: string
          deletadoEm?: string | null
          id: string
          orientacoes?: string | null
          prescricao?: string | null
          procedimentoId?: string | null
          prontuarioId: string
          tipo: Database["public"]["Enums"]["TipoEvolucao"]
          titulo: string
        }
        Update: {
          atualizadoEm?: string
          conteudo?: string
          criadoEm?: string
          dataRegistro?: string
          deletadoEm?: string | null
          id?: string
          orientacoes?: string | null
          prescricao?: string | null
          procedimentoId?: string | null
          prontuarioId?: string
          tipo?: Database["public"]["Enums"]["TipoEvolucao"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolucoes_procedimentoId_fkey"
            columns: ["procedimentoId"]
            isOneToOne: false
            referencedRelation: "procedimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolucoes_prontuarioId_fkey"
            columns: ["prontuarioId"]
            isOneToOne: false
            referencedRelation: "prontuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      fotos_contato: {
        Row: {
          categoria: string
          ciclo: number | null
          contatoId: string
          criadoEm: string
          dataRegistro: string | null
          descricao: string | null
          id: string
          tipoAnalise: string | null
          url: string
        }
        Insert: {
          categoria?: string
          ciclo?: number | null
          contatoId: string
          criadoEm?: string
          dataRegistro?: string | null
          descricao?: string | null
          id: string
          tipoAnalise?: string | null
          url: string
        }
        Update: {
          categoria?: string
          ciclo?: number | null
          contatoId?: string
          criadoEm?: string
          dataRegistro?: string | null
          descricao?: string | null
          id?: string
          tipoAnalise?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_contato_contatoId_fkey"
            columns: ["contatoId"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_whatsapp: {
        Row: {
          contatoId: string
          conteudo: string
          conversaId: string
          criadoEm: string
          id: string
          lidaEm: string | null
          mediaType: string | null
          mediaUrl: string | null
          messageIdWhatsapp: string
          remetente: string
          replyToId: string | null
          tipo: Database["public"]["Enums"]["TipoMensagem"]
        }
        Insert: {
          contatoId: string
          conteudo: string
          conversaId: string
          criadoEm?: string
          id: string
          lidaEm?: string | null
          mediaType?: string | null
          mediaUrl?: string | null
          messageIdWhatsapp: string
          remetente: string
          replyToId?: string | null
          tipo: Database["public"]["Enums"]["TipoMensagem"]
        }
        Update: {
          contatoId?: string
          conteudo?: string
          conversaId?: string
          criadoEm?: string
          id?: string
          lidaEm?: string | null
          mediaType?: string | null
          mediaUrl?: string | null
          messageIdWhatsapp?: string
          remetente?: string
          replyToId?: string | null
          tipo?: Database["public"]["Enums"]["TipoMensagem"]
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_whatsapp_contatoId_fkey"
            columns: ["contatoId"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_whatsapp_conversaId_fkey"
            columns: ["conversaId"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_whatsapp_replyToId_fkey"
            columns: ["replyToId"]
            isOneToOne: false
            referencedRelation: "mensagens_whatsapp"
            referencedColumns: ["id"]
          },
        ]
      }
      midia_marketing: {
        Row: {
          atualizadoEm: string | null
          criadoEm: string | null
          deletadoEm: string | null
          descricao: string
          id: string
          url: string
        }
        Insert: {
          atualizadoEm?: string | null
          criadoEm?: string | null
          deletadoEm?: string | null
          descricao: string
          id?: string
          url: string
        }
        Update: {
          atualizadoEm?: string | null
          criadoEm?: string | null
          deletadoEm?: string | null
          descricao?: string
          id?: string
          url?: string
        }
        Relationships: []
      }
      procedimentos: {
        Row: {
          ativo: boolean
          atualizadoEm: string
          criadoEm: string
          deletadoEm: string | null
          descricao: string | null
          duracaoMin: number
          id: string
          nome: string
          posOperatorio: string | null
          tipo: string
        }
        Insert: {
          ativo?: boolean
          atualizadoEm: string
          criadoEm?: string
          deletadoEm?: string | null
          descricao?: string | null
          duracaoMin: number
          id: string
          nome: string
          posOperatorio?: string | null
          tipo: string
        }
        Update: {
          ativo?: boolean
          atualizadoEm?: string
          criadoEm?: string
          deletadoEm?: string | null
          descricao?: string | null
          duracaoMin?: number
          id?: string
          nome?: string
          posOperatorio?: string | null
          tipo?: string
        }
        Relationships: []
      }
      prontuarios: {
        Row: {
          atualizadoEm: string
          contatoId: string
          criadoEm: string
          id: string
          numero: number
        }
        Insert: {
          atualizadoEm: string
          contatoId: string
          criadoEm?: string
          id: string
          numero: number
        }
        Update: {
          atualizadoEm?: string
          contatoId?: string
          criadoEm?: string
          id?: string
          numero?: number
        }
        Relationships: [
          {
            foreignKeyName: "prontuarios_contatoId_fkey"
            columns: ["contatoId"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_cirurgicos: {
        Row: {
          anestesista: string | null
          atualizadoEm: string
          complicacoes: string | null
          criadoEm: string
          evolucaoId: string
          id: string
          marcosRecuperacao: Json | null
          materiaisUtilizados: string | null
          orientacoesPosOp: string | null
          sangramento: string | null
          tecnicaUtilizada: string
          tempoCircurgicoMinutos: number
          tipoAnestesia: Database["public"]["Enums"]["TipoAnestesia"]
        }
        Insert: {
          anestesista?: string | null
          atualizadoEm: string
          complicacoes?: string | null
          criadoEm?: string
          evolucaoId: string
          id: string
          marcosRecuperacao?: Json | null
          materiaisUtilizados?: string | null
          orientacoesPosOp?: string | null
          sangramento?: string | null
          tecnicaUtilizada: string
          tempoCircurgicoMinutos: number
          tipoAnestesia: Database["public"]["Enums"]["TipoAnestesia"]
        }
        Update: {
          anestesista?: string | null
          atualizadoEm?: string
          complicacoes?: string | null
          criadoEm?: string
          evolucaoId?: string
          id?: string
          marcosRecuperacao?: Json | null
          materiaisUtilizados?: string | null
          orientacoesPosOp?: string | null
          sangramento?: string | null
          tecnicaUtilizada?: string
          tempoCircurgicoMinutos?: number
          tipoAnestesia?: Database["public"]["Enums"]["TipoAnestesia"]
        }
        Relationships: [
          {
            foreignKeyName: "registros_cirurgicos_evolucaoId_fkey"
            columns: ["evolucaoId"]
            isOneToOne: false
            referencedRelation: "evolucoes"
            referencedColumns: ["id"]
          },
        ]
      }
      sinais_vitais: {
        Row: {
          criadoEm: string
          dataRegistro: string
          id: string
          observacao: string | null
          prontuarioId: string
          tipo: Database["public"]["Enums"]["TipoSinalVital"]
          unidade: string
          valor: string
        }
        Insert: {
          criadoEm?: string
          dataRegistro?: string
          id: string
          observacao?: string | null
          prontuarioId: string
          tipo: Database["public"]["Enums"]["TipoSinalVital"]
          unidade: string
          valor: string
        }
        Update: {
          criadoEm?: string
          dataRegistro?: string
          id?: string
          observacao?: string | null
          prontuarioId?: string
          tipo?: Database["public"]["Enums"]["TipoSinalVital"]
          unidade?: string
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "sinais_vitais_prontuarioId_fkey"
            columns: ["prontuarioId"]
            isOneToOne: false
            referencedRelation: "prontuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_itens: {
        Row: {
          concluido: boolean
          criadoEm: string
          id: string
          ordem: number
          sprintId: string
          titulo: string
        }
        Insert: {
          concluido?: boolean
          criadoEm?: string
          id: string
          ordem?: number
          sprintId: string
          titulo: string
        }
        Update: {
          concluido?: boolean
          criadoEm?: string
          id?: string
          ordem?: number
          sprintId?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_itens_sprintId_fkey"
            columns: ["sprintId"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          atualizadoEm: string
          criadoEm: string
          dataFim: string | null
          dataInicio: string | null
          deletadoEm: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number
          status: Database["public"]["Enums"]["StatusSprint"]
        }
        Insert: {
          atualizadoEm: string
          criadoEm?: string
          dataFim?: string | null
          dataInicio?: string | null
          deletadoEm?: string | null
          descricao?: string | null
          id: string
          nome: string
          ordem?: number
          status?: Database["public"]["Enums"]["StatusSprint"]
        }
        Update: {
          atualizadoEm?: string
          criadoEm?: string
          dataFim?: string | null
          dataInicio?: string | null
          deletadoEm?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          status?: Database["public"]["Enums"]["StatusSprint"]
        }
        Relationships: []
      }
      tipos_procedimento: {
        Row: {
          ativo: boolean
          criadoEm: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          criadoEm?: string
          id: string
          nome: string
        }
        Update: {
          ativo?: boolean
          criadoEm?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          ativo: boolean
          atualizadoEm: string
          criadoEm: string
          deletadoEm: string | null
          email: string
          fotoUrl: string | null
          id: string
          nome: string
          perfil: Database["public"]["Enums"]["Perfil"]
          senha: string
          tipo: Database["public"]["Enums"]["TipoUsuario"]
        }
        Insert: {
          ativo?: boolean
          atualizadoEm: string
          criadoEm?: string
          deletadoEm?: string | null
          email: string
          fotoUrl?: string | null
          id: string
          nome: string
          perfil: Database["public"]["Enums"]["Perfil"]
          senha: string
          tipo?: Database["public"]["Enums"]["TipoUsuario"]
        }
        Update: {
          ativo?: boolean
          atualizadoEm?: string
          criadoEm?: string
          deletadoEm?: string | null
          email?: string
          fotoUrl?: string | null
          id?: string
          nome?: string
          perfil?: Database["public"]["Enums"]["Perfil"]
          senha?: string
          tipo?: Database["public"]["Enums"]["TipoUsuario"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      EtapaConversa:
        | "acolhimento"
        | "qualificacao"
        | "agendamento"
        | "consulta_agendada"
      ModoConversa: "ia" | "humano"
      Perfil: "gestor" | "atendente"
      StatusAgendamento:
        | "agendado"
        | "confirmado"
        | "cancelado"
        | "realizado"
        | "remarcado"
      StatusFunil:
        | "acolhimento"
        | "qualificacao"
        | "agendamento"
        | "consulta_agendada"
      StatusSprint: "planejada" | "em_andamento" | "concluida"
      TipoAgendamento:
        | "diagnostico"
        | "consulta_online"
        | "consulta_presencial"
        | "procedimento"
        | "retorno"
        | "pos_operatorio"
      TipoAnestesia:
        | "local"
        | "sedacao"
        | "geral"
        | "raquidiana"
        | "peridural"
        | "bloqueio_regional"
      TipoContato: "lead" | "paciente"
      TipoDocumentoProntuario:
        | "exame_laboratorial"
        | "laudo"
        | "termo_consentimento"
        | "receita"
        | "atestado"
        | "outro"
      TipoEvolucao:
        | "consulta"
        | "procedimento"
        | "retorno"
        | "prescricao"
        | "intercorrencia"
        | "observacao"
      TipoMensagem:
        | "texto"
        | "audio"
        | "imagem"
        | "documento"
        | "video"
        | "sticker"
      TipoSinalVital:
        | "pressao_arterial"
        | "frequencia_cardiaca"
        | "temperatura"
        | "saturacao_o2"
        | "glicemia"
      TipoUsuario: "humano" | "ia"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      EtapaConversa: [
        "acolhimento",
        "qualificacao",
        "agendamento",
        "consulta_agendada",
      ],
      ModoConversa: ["ia", "humano"],
      Perfil: ["gestor", "atendente"],
      StatusAgendamento: [
        "agendado",
        "confirmado",
        "cancelado",
        "realizado",
        "remarcado",
      ],
      StatusFunil: [
        "acolhimento",
        "qualificacao",
        "agendamento",
        "consulta_agendada",
      ],
      StatusSprint: ["planejada", "em_andamento", "concluida"],
      TipoAgendamento: [
        "diagnostico",
        "consulta_online",
        "consulta_presencial",
        "procedimento",
        "retorno",
        "pos_operatorio",
      ],
      TipoAnestesia: [
        "local",
        "sedacao",
        "geral",
        "raquidiana",
        "peridural",
        "bloqueio_regional",
      ],
      TipoContato: ["lead", "paciente"],
      TipoDocumentoProntuario: [
        "exame_laboratorial",
        "laudo",
        "termo_consentimento",
        "receita",
        "atestado",
        "outro",
      ],
      TipoEvolucao: [
        "consulta",
        "procedimento",
        "retorno",
        "prescricao",
        "intercorrencia",
        "observacao",
      ],
      TipoMensagem: [
        "texto",
        "audio",
        "imagem",
        "documento",
        "video",
        "sticker",
      ],
      TipoSinalVital: [
        "pressao_arterial",
        "frequencia_cardiaca",
        "temperatura",
        "saturacao_o2",
        "glicemia",
      ],
      TipoUsuario: ["humano", "ia"],
    },
  },
} as const
