// Тестируем точный запрос от фронтенда на основе логов
// Используем встроенный fetch в Node.js 18+

async function testFrontendRequest() {
  console.log('🔍 Тестируем запрос от фронтенда...');
  
  // Данные из логов фронтенда
  const requestData = {
    scanInterval: 1,
    selectedChats: [
      "-1001611947303", // Пример длинного ID из логов
      "-1001234567890", // Добавим еще несколько для теста
      "-1001987654321",
      "-1001555666777"
    ],
    telegramConfig: {
      apiId: 12345678,
      apiHash: "test_api_hash_example_string",
      sessionString: "1BVtsOLwABpyi-FdVQABCNbwU_test_session_string_example_very_long_string_that_might_cause_issues_with_request_size_and_parsing_in_backend_server_processing_logic_and_validation_routines_that_check_for_proper_format_and_length_constraints_in_telegram_api_integration_modules_and_authentication_handlers_that_process_user_credentials_and_session_management_functionality_for_secure_communication_with_telegram_servers_and_api_endpoints_that_require_proper_authorization_tokens_and_session_identifiers_for_accessing_chat_data_and_message_history_from_selected_telegram_channels_and_groups_specified_by_user_in_application_settings_configuration_panel_interface_components"
    },
    sheetsConfig: {
      serviceAccountEmail: "test@example.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB\nwxFnOGpCGFYjVGVs2+7YGWdGF4g5J0ByoDHCANwjnP4X9wdpukrpotFr7dy9qB\nUrMxjzrW221b+Yg8lgIrJ1oduHSBINeSp7RizHRzLrRwN7bgLs/9up4S1cjKs2\nBLIyHVd9lqdNdAaM1SuoSiQgNQQn2w\n-----END PRIVATE KEY-----"
    },
    spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    leadAnalysisSettings: {
      openrouterApiKey: "sk-or-v1-test-key-example-very-long-api-key-string-that-might-be-causing-issues-with-request-parsing-or-validation-in-backend-server-processing-logic-and-authentication-handlers-that-check-for-proper-api-key-format-and-length-constraints-in-openrouter-integration-modules-and-ai-analysis-functionality-for-lead-detection-and-classification-algorithms-that-process-telegram-messages-and-extract-relevant-information-about-potential-leads-based-on-user-defined-criteria-and-filtering-rules-specified-in-application-configuration-settings-panel-interface-components-and-lead-analysis-parameters-that-determine-how-ai-models-should-evaluate-and-categorize-incoming-messages-from-selected-telegram-channels-and-groups-for_automated_lead_generation_and_tracking_workflows",
      leadCriteria: "любые лиды"
    }
  };

  try {
    console.log('📤 Отправляем запрос на http://localhost:3001/api/scanner/start');
    console.log('📊 Размер данных:', JSON.stringify(requestData).length, 'символов');
    
    const response = await fetch('http://localhost:3001/api/scanner/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    console.log('📥 Статус ответа:', response.status);
    console.log('📥 Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📥 Тело ответа:', responseText);
    
    if (response.ok) {
      console.log('✅ Запрос успешен!');
    } else {
      console.log('❌ Ошибка:', response.status, responseText);
    }
    
  } catch (error) {
    console.error('💥 Ошибка запроса:', error.message);
  }
}

testFrontendRequest();