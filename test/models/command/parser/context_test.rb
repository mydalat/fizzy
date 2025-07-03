require "test_helper"

class Command::Parser::ContextTest < ActiveSupport::TestCase
  include Rails.application.routes.url_helpers

  setup do
    @user = users(:david)
    @context = Command::Parser::Context.new(@user, url: cards_path)

    Card.find_each(&:reindex)
    Comment.find_each(&:reindex)
  end

  test "viewing a single card" do
    context = Command::Parser::Context.new(@user, url: card_path(cards(:layout)))

    assert context.viewing_card_contents?
    assert_not context.viewing_list_of_cards?

    assert_equal 1, context.cards.count
    assert_equal cards(:layout).id, context.cards.first.id
  end

  test "viewing cards index" do
    context = Command::Parser::Context.new(@user, url: cards_path)

    assert context.viewing_list_of_cards?
    assert_not context.viewing_card_contents?

    assert_equal @user.filters.from_params(FilterScoped::DEFAULT_PARAMS).cards.published.count, context.cards.count
  end

  test "viewing search results" do
    context = Command::Parser::Context.new(@user, url: search_path(q: "layout"))

    assert context.viewing_list_of_cards?
    assert_not context.viewing_card_contents?

    expected_cards = @user.accessible_cards.where(id: @user.search("layout").select(:card_id))

    assert_equal expected_cards.count, context.cards.count
    assert_equal expected_cards.pluck(:id).sort, context.cards.pluck(:id).sort
  end

  test "unrecognized URL pattern" do
    context = Command::Parser::Context.new(@user, url: filters_path)

    assert_not context.viewing_card_contents?
    assert_not context.viewing_list_of_cards?

    assert_empty context.cards
  end

  test "find_user by handle" do
    assert_equal users(:david), @context.find_user("david")
    assert_equal users(:david), @context.find_user("@david")
    assert_equal users(:jz), @context.find_user("jz")
    assert_equal users(:kevin), @context.find_user("kevin")
    assert_nil @context.find_user("nonexistent")
  end

  test "find_user by GID" do
    david_gid = users(:david).to_gid.to_s
    assert_equal users(:david), @context.find_user(david_gid)

    jz_gid = users(:jz).to_gid.to_s
    assert_equal users(:jz), @context.find_user(jz_gid)

    assert_nil @context.find_user("invalid-gid")
  end

  test "find_workflow_stage" do
    card_context = Command::Parser::Context.new(@user, url: card_path(cards(:logo)))

    assert_equal workflow_stages(:qa_triage), card_context.find_workflow_stage("triage")
    assert_equal workflow_stages(:qa_in_progress), card_context.find_workflow_stage("in progress")
    assert_equal workflow_stages(:qa_on_hold), card_context.find_workflow_stage("on hold")
    assert_equal workflow_stages(:qa_review), card_context.find_workflow_stage("review")

    assert_equal workflow_stages(:qa_in_progress), card_context.find_workflow_stage("progress")

    assert_nil card_context.find_workflow_stage("nonexistent")
  end

  test "find_tag with title" do
    assert_equal tags(:web), @context.find_tag("web")
    assert_equal tags(:web), @context.find_tag("#web")
    assert_equal tags(:mobile), @context.find_tag("mobile")

    assert_nil @context.find_tag("nonexistent")
  end

  test "find_tag by GID" do
    web_gid = tags(:web).to_gid.to_s
    assert_equal tags(:web), @context.find_tag(web_gid)

    mobile_gid = tags(:mobile).to_gid.to_s
    assert_equal tags(:mobile), @context.find_tag(mobile_gid)

    assert_nil @context.find_tag("invalid-gid")
  end

  test "find_collection" do
    assert_equal collections(:writebook), @context.find_collection("Writebook")
    assert_equal collections(:writebook), @context.find_collection("writebook")

    assert_equal collections(:private), @context.find_collection("Private collection")
    assert_equal collections(:private), @context.find_collection("private collection")

    assert_equal collections(:writebook), @context.find_collection("write")
    assert_equal collections(:private), @context.find_collection("private")

    assert_nil @context.find_collection("nonexistent")
  end
end
