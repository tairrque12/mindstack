from unittest.mock import MagicMock, patch

from app.services.utils import SourceType, generate_embedding


def test_generate_embedding_returns_1536_floats():
    mock_response = MagicMock()
    mock_response.data = [MagicMock(embedding=[0.1] * 1536)]
    with patch("app.services.utils.OpenAI") as mock_openai:
        mock_openai.return_value.embeddings.create.return_value = mock_response
        result = generate_embedding("test content")
    assert len(result) == 1536
    assert all(isinstance(v, float) for v in result)


def test_generate_embedding_uses_correct_model():
    mock_response = MagicMock()
    mock_response.data = [MagicMock(embedding=[0.1] * 1536)]
    with patch("app.services.utils.OpenAI") as mock_openai:
        mock_client = mock_openai.return_value
        mock_client.embeddings.create.return_value = mock_response
        generate_embedding("test content")
    mock_client.embeddings.create.assert_called_once_with(
        model="text-embedding-3-small",
        input="test content",
    )


def test_source_type_values_are_strings():
    for st in SourceType:
        assert isinstance(st.value, str), f"{st.name} value is not a string"
        assert isinstance(st, str), f"{st.name} is not a str instance (missing str mixin)"


def test_source_type_covers_all_sources():
    assert len(SourceType) == 10
    assert {st.value for st in SourceType} == {
        "book", "tweet", "youtube", "podcast", "voice_memo",
        "linkedin", "reddit", "conversation", "handwritten", "note",
    }
