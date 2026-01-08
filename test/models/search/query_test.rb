require "test_helper"

class Search::QueryTest < ActiveSupport::TestCase
  setup do
    @account = accounts(:"37s")
    Current.account = @account
  end

  test "sanitize preserves ASCII words" do
    query = build_query("hello world")

    assert_equal "hello world", query.terms
  end

  test "sanitize preserves Chinese characters" do
    query = build_query("测试文本")

    assert_equal "测试文本", query.terms
  end

  test "sanitize preserves Japanese characters" do
    query = build_query("テスト")

    assert_equal "テスト", query.terms
  end

  test "sanitize preserves Korean characters" do
    query = build_query("테스트")

    assert_equal "테스트", query.terms
  end

  test "sanitize preserves mixed CJK and English" do
    query = build_query("hello 世界 test")

    assert_equal "hello 世界 test", query.terms
  end

  test "sanitize removes special characters but preserves CJK" do
    query = build_query("测试@文本")

    assert_equal "测试 文本", query.terms
  end

  test "sanitize preserves quoted phrases with CJK" do
    query = build_query('"你好世界"')

    assert_equal '"你好世界"', query.terms
  end

  private
    def build_query(terms)
      query = Search::Query.wrap(terms)
      query.validate
      query
    end
end
