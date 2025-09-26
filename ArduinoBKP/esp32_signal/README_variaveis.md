# Variáveis mapeadas para integração Arduino ⇄ Firebase ⇄ App/Unity

## Estrutura recomendada no Firebase Realtime Database

```
/planta/
  pv: number         # Process Variable
  sp: number         # Setpoint
  mv: number         # Manipulated Variable
  cv: number         # Control Variable
  error: number      # Erro (sp - pv)
  status: string     # Status textual

/setpoint/
  sp: number         # Setpoint (página setpoint)

/signal/
  bool: boolean      # Estado booleano (página signal)
  bool_cmd: boolean  # Comando booleano (toggle)
```

## Resumo das variáveis

- **/planta/**
  - pv
  - sp
  - mv
  - cv
  - error
  - status
- **/setpoint/**
  - sp
- **/signal/**
  - bool
  - bool_cmd

> Todas devem ser criadas e atualizadas pelo Arduino, inicialmente com valores aleatórios.
> Fique à vontade para expandir ou reorganizar conforme sensores reais no futuro.

## Observação
- O mesmo mapeamento pode ser usado no Codesys ou em outros sistemas para integração.
- Recomenda-se manter os nomes e paths consistentes para facilitar manutenção e integração multiplataforma.
