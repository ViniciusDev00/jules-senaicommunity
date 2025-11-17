package com.SenaiCommunity.BackEnd.Config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        // Garante que as roles existam com os IDs EXATOS definidos no seu Enum

        // ID 1: ADMIN
        inserirRoleSeNaoExistir(1L, "ADMIN");

        // ID 2: PROFESSOR
        inserirRoleSeNaoExistir(2L, "PROFESSOR");

        // ID 3: ALUNO
        inserirRoleSeNaoExistir(3L, "ALUNO");

        // ID 4: SUPERVISOR (Esta é a que está faltando e causando o erro)
        inserirRoleSeNaoExistir(4L, "SUPERVISOR");
    }

    private void inserirRoleSeNaoExistir(Long id, String nome) {
        // Verifica se o ID já existe
        String sqlCheck = "SELECT count(*) FROM tb_roles WHERE role_id = ?";
        Integer count = jdbcTemplate.queryForObject(sqlCheck, Integer.class, id);

        if (count != null && count == 0) {
            // Se não existir, insere forçando o ID correto
            String sqlInsert = "INSERT INTO tb_roles (role_id, nome) VALUES (?, ?)";
            jdbcTemplate.update(sqlInsert, id, nome);
            System.out.println("✅ Role criada automaticamente: " + nome + " (ID: " + id + ")");
        }
    }
}